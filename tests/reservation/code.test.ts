import { describe, it, expect } from "vitest";
import { generateBookingCode } from "@/lib/reservation/code";

describe("generateBookingCode", () => {
  it("formato ARM-AAAA-XXXX con sufijo de 4 chars del alfabeto", () => {
    const code = generateBookingCode(2026, () => 0); // rand=0 → primer char del alfabeto
    // regex que excluye los ambiguos (I y O) igual que el alfabeto real
    expect(code).toMatch(/^ARM-2026-[A-HJ-NP-Z2-9]{4}$/);
    expect(code).toBe("ARM-2026-AAAA");
  });

  it("usa el año pasado por parámetro", () => {
    expect(generateBookingCode(2030, () => 0)).toBe("ARM-2030-AAAA");
  });

  it("el sufijo no contiene caracteres ambiguos (0 O 1 I)", () => {
    for (let i = 0; i < 40; i++) {
      const r = i / 40;
      const code = generateBookingCode(2026, () => r);
      expect(code.slice(9)).not.toMatch(/[01OI]/);
    }
  });

  it("blinda rand()===1 (índice fuera de rango) y mantiene 4 chars", () => {
    const code = generateBookingCode(2026, () => 1);
    expect(code).toBe("ARM-2026-9999"); // clamp al último char del alfabeto
  });

  it("genera valores distintos con Math.random (sin colisión obvia en 200)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(generateBookingCode());
    expect(seen.size).toBeGreaterThan(190);
  });
});
