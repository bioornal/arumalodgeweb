import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clientIp, rateLimited, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("clientIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("sin header devuelve 'unknown'", () => {
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });
});

describe("rateLimited", () => {
  it("deja pasar hasta el máximo y bloquea el siguiente", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(false);
    }
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
  });

  it("cuenta por IP: una IP saturada no bloquea a otra", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
    expect(rateLimited("pagos", "2.2.2.2", 3, 60_000)).toBe(false);
  });

  it("cuenta por scope: saturar pagos no bloquea lookup", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
    expect(rateLimited("lookup", "1.1.1.1", 3, 60_000)).toBe(false);
  });

  it("se libera cuando pasa la ventana", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);

    vi.advanceTimersByTime(60_001);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(false);
  });
});
