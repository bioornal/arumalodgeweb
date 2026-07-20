import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/reservation/availability.server", () => ({
  getAvailabilityServer: vi.fn(),
}));

// Tarifas: siempre los defaults (los mismos valores de lib/units) — el test no
// depende de la DB ni de lo que el admin edite en /admin/tarifas.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import { getRatesForRange } from "@/lib/reservation/rates.server";
import { UNITS, pricePerNight } from "@/lib/units";
import { DEFAULT_RATE_SETTINGS } from "@/lib/reservation/rate-settings";
import { methodTotal, transferSavings } from "@/lib/reservation/method-pricing";

const mocked = vi.mocked(getAvailabilityServer);

beforeEach(() => mocked.mockReset());

describe("getRatesForRange", () => {
  it("disponible + montos públicos = método tarjeta (comisión incluida) + ahorro transferencia", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates).toHaveLength(UNITS.length);
    const yvyra = rates.find((r) => r.unit.slug === "yvyra")!;
    expect(yvyra.nights).toBe(3);
    expect(yvyra.available).toBe(true);
    expect(yvyra.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "yvyra", 3));
    expect(yvyra.transferTotal).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "transfer", "yvyra", 3));
    expect(yvyra.savings).toBe(transferSavings(DEFAULT_RATE_SETTINGS, "yvyra", 3));
    expect(yvyra.savings).toBeGreaterThan(0);
    // El precio de lista es MAYOR al neto configurado (la comisión va adentro)
    expect(yvyra.nightly).toBeGreaterThan(DEFAULT_RATE_SETTINGS.nightly.yvyra);
  });

  it("tarifa plana: mismo precio sin importar el número de huéspedes", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 6);
    const yvyra = rates.find((r) => r.unit.slug === "yvyra")!;
    expect(yvyra.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "yvyra", 3));
    expect(pricePerNight("yvyra", 6)).toBe(200000);
    expect(pricePerNight("mberu", 6)).toBe(200000);
  });

  it("tatu: total de lista consistente con method-pricing", async () => {
    mocked.mockResolvedValue({ disabledDates: [], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    const tatu = rates.find((r) => r.unit.slug === "tatu")!;
    expect(tatu.total).toBe(methodTotal(DEFAULT_RATE_SETTINGS, "card", "tatu", 3));
    expect(pricePerNight("tatu", 4)).toBe(130000);
  });

  it("no disponible si alguna noche del rango está ocupada", async () => {
    mocked.mockResolvedValue({ disabledDates: [new Date(2026, 6, 3)], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates.every((r) => r.available === false)).toBe(true);
  });

  it("el check-out es exclusivo: una fecha ocupada igual al check-out no afecta", async () => {
    mocked.mockResolvedValue({ disabledDates: [new Date(2026, 6, 5)], source: "google-calendar" });
    const rates = await getRatesForRange("2026-07-02", "2026-07-05", 4);
    expect(rates.every((r) => r.available === true)).toBe(true);
  });
});
