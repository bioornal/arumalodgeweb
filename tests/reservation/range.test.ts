import { describe, it, expect } from "vitest";
import { pickDay, type RangeValue } from "@/lib/reservation/range";

const d = (s: string) => new Date(s + "T00:00:00");
const empty: RangeValue = { checkIn: null, checkOut: null };

describe("pickDay", () => {
  it("primer pick setea checkIn y limpia checkOut", () => {
    expect(pickDay(empty, d("2026-06-10"))).toEqual({ checkIn: d("2026-06-10"), checkOut: null });
  });
  it("segundo pick posterior setea checkOut", () => {
    const r = pickDay(empty, d("2026-06-10"));
    expect(pickDay(r, d("2026-06-13"))).toEqual({ checkIn: d("2026-06-10"), checkOut: d("2026-06-13") });
  });
  it("segundo pick anterior o igual reinicia el rango en esa fecha", () => {
    const r = pickDay(empty, d("2026-06-10"));
    expect(pickDay(r, d("2026-06-08"))).toEqual({ checkIn: d("2026-06-08"), checkOut: null });
    expect(pickDay(r, d("2026-06-10"))).toEqual({ checkIn: d("2026-06-10"), checkOut: null });
  });
  it("pick con rango completo empieza uno nuevo", () => {
    const full: RangeValue = { checkIn: d("2026-06-10"), checkOut: d("2026-06-13") };
    expect(pickDay(full, d("2026-06-20"))).toEqual({ checkIn: d("2026-06-20"), checkOut: null });
  });
});
