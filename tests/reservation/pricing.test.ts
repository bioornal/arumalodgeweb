import { describe, it, expect } from "vitest";
import { computeNights, computeSubtotal, computeTotal } from "@/lib/reservation/pricing";

const d = (s: string) => new Date(s + "T00:00:00");

describe("pricing", () => {
  it("nights = diferencia en días de calendario", () => {
    expect(computeNights(d("2026-06-10"), d("2026-06-13"))).toBe(3);
  });
  it("nights 0 si falta una fecha", () => {
    expect(computeNights(d("2026-06-10"), null)).toBe(0);
    expect(computeNights(null, null)).toBe(0);
  });
  it("subtotal = precio × noches", () => {
    expect(computeSubtotal(120, 3)).toBe(360);
  });
  it("total = subtotal + limpieza cuando hay noches", () => {
    expect(computeTotal(120, 3, 35)).toBe(395);
  });
  it("total 0 sin noches (no cobra limpieza)", () => {
    expect(computeTotal(120, 0, 35)).toBe(0);
  });
});
