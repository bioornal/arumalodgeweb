import { describe, it, expect } from "vitest";
import { formatDateOnly, parseDateOnly } from "@/lib/reservation/booking";

describe("formatDateOnly", () => {
  it("formatea Date local a YYYY-MM-DD sin corrimiento de TZ", () => {
    expect(formatDateOnly(new Date(2026, 6, 2))).toBe("2026-07-02");
  });

  it("padea mes y día de un dígito a 2 dígitos", () => {
    expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseDateOnly", () => {
  it("convierte YYYY-MM-DD a Date local a medianoche", () => {
    const d = parseDateOnly("2026-07-02");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // julio = 6
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(0);
  });
  it("es inversa de formatDateOnly", () => {
    expect(parseDateOnly("2026-12-31").getDate()).toBe(31);
  });
});
