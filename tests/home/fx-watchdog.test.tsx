import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { FxWatchdog, FX_OFF_KEY } from "@/components/motion/FxWatchdog";

// rAF controlado: el test dispara los frames con timestamps elegidos
let rafQueue: FrameRequestCallback[] = [];
function flushFrame(ts: number) {
  const cbs = rafQueue;
  rafQueue = [];
  cbs.forEach((cb) => cb(ts));
}

let reloadSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
  reloadSpy = vi.fn();
  Object.defineProperty(window, "location", {
    value: { ...window.location, reload: reloadSpy },
    writable: true,
  });
  localStorage.clear();
  delete document.documentElement.dataset.fx;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.fx;
});

/** Monta el watchdog y agota el warmup para que empiece a muestrear. */
function mountAndWarmup() {
  const utils = render(<FxWatchdog />);
  vi.advanceTimersByTime(700); // warmup de 600ms
  return utils;
}

describe("FxWatchdog", () => {
  it("no mide en modo diagnóstico (data-fx ya presente)", () => {
    document.documentElement.dataset.fx = "";
    render(<FxWatchdog />);
    vi.advanceTimersByTime(3000);
    expect(rafQueue).toHaveLength(0);
  });

  it("no mide con prefers-reduced-motion (los efectos ya están apagados)", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    render(<FxWatchdog />);
    vi.advanceTimersByTime(3000);
    expect(rafQueue).toHaveLength(0);
  });

  it("degrada (flag + reload) cuando el FPS medido queda bajo el umbral", () => {
    mountAndWarmup();
    // frame ancla + frames a ~10fps durante 2s
    flushFrame(1000);
    for (let t = 1100; t <= 3200; t += 100) flushFrame(t);
    expect(localStorage.getItem(FX_OFF_KEY)).not.toBeNull();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it("no degrada cuando el FPS es sano", () => {
    mountAndWarmup();
    // frame ancla + frames a 60fps durante 2s
    flushFrame(1000);
    for (let t = 1016; t <= 3100; t += 16) flushFrame(t);
    expect(localStorage.getItem(FX_OFF_KEY)).toBeNull();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("deadman: degrada si rAF muere y la muestra nunca se completa (freeze instantáneo)", () => {
    mountAndWarmup();
    // rAF encolado pero ningún frame llega a dispararse (compositor colgado)
    vi.advanceTimersByTime(4500);
    expect(localStorage.getItem(FX_OFF_KEY)).not.toBeNull();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it("deadman: no dispara si la muestra ya terminó con veredicto sano", () => {
    mountAndWarmup();
    flushFrame(1000);
    for (let t = 1016; t <= 3100; t += 16) flushFrame(t);
    vi.advanceTimersByTime(6000);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("aborta la medición si la pestaña pasa a segundo plano (rAF throttled daría falso positivo)", () => {
    mountAndWarmup();
    flushFrame(1000);
    flushFrame(1100);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    // aunque después lleguen "frames" lentos, ya no debe evaluar
    for (let t = 1200; t <= 3400; t += 200) flushFrame(t);
    expect(reloadSpy).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });
});
