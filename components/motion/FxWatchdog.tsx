"use client";
import { useEffect } from "react";

/** Clave en localStorage: timestamp de cuándo se degradó (TTL 24h). */
export const FX_OFF_KEY = "aruma-fx-off";

// Umbral y ventanas del muestreo. El warmup saltea el pico de hidratación
// (ahí hasta una máquina sana tiene frames largos); recién después se mide.
const MIN_FPS = 24;
const WARMUP_MS = 600;
const SAMPLE_MS = 1800;

/**
 * Auto-degradado de efectos: mide los FPS reales al cargar y, si la máquina
 * no llega a MIN_FPS, graba FX_OFF_KEY y recarga. El script inline del layout
 * lee ese flag ANTES de hidratar y arranca con data-fx="" (todo apagado, el
 * mismo mecanismo de ?sinfx=1), así que tras la recarga los efectos nunca
 * llegan a montarse. El flag vence a las 24h para que una máquina que tuvo
 * un mal día recupere los efectos sola.
 *
 * No corre si data-fx ya está presente (modo diagnóstico por URL, o ya
 * degradado: sin efectos los FPS no dicen nada) ni con reduced motion. La
 * medición se aborta si la pestaña pasa a segundo plano, porque el navegador
 * throttlea rAF en tabs ocultos y eso daría un falso positivo.
 */
export function FxWatchdog() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.fx !== undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.hidden) return;

    let stopped = false;
    let raf = 0;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const degrade = () => {
      try {
        localStorage.setItem(FX_OFF_KEY, String(Date.now()));
      } catch {
        // sin storage no hay persistencia posible; recargar igual no ayuda
        return;
      }
      window.location.reload();
    };

    let start = -1;
    let frames = 0;
    const loop = (ts: number) => {
      if (stopped) return;
      if (start < 0) {
        start = ts; // frame ancla: los intervalos se miden desde acá
      } else {
        frames++;
        const elapsed = ts - start;
        if (elapsed >= SAMPLE_MS) {
          if ((frames * 1000) / elapsed < MIN_FPS) degrade();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const warmup = window.setTimeout(() => {
      if (!stopped && !document.hidden) raf = requestAnimationFrame(loop);
    }, WARMUP_MS);

    return () => {
      stop();
      window.clearTimeout(warmup);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
