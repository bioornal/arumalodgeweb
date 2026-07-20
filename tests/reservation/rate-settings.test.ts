import { describe, it, expect } from "vitest";
import {
  DEFAULT_RATE_SETTINGS,
  parseRateSettingsInput,
  rowToSettings,
  settingsToRow,
  type RateSettingsInput,
} from "@/lib/reservation/rate-settings";
import { UNITS, CLEANING_FEE, BASE_GUESTS } from "@/lib/units";

const VALID: RateSettingsInput = {
  nightly_yvyra: "210000",
  nightly_mberu: "195000",
  nightly_tatu: "140000",
  cleaning_fee: "35000",
  base_guests: "4",
  extra_guest_fee: "15000",
};

describe("DEFAULT_RATE_SETTINGS", () => {
  it("espeja los valores históricos de lib/units (fallback seguro)", () => {
    for (const u of UNITS) {
      expect(DEFAULT_RATE_SETTINGS.nightly[u.slug]).toBe(u.price);
    }
    expect(DEFAULT_RATE_SETTINGS.cleaningFee).toBe(CLEANING_FEE);
    expect(DEFAULT_RATE_SETTINGS.baseGuests).toBe(BASE_GUESTS);
    expect(DEFAULT_RATE_SETTINGS.extraGuestFee).toBe(0);
  });
});

describe("rowToSettings / settingsToRow", () => {
  it("round-trip conserva todos los campos", () => {
    const s = rowToSettings({
      nightly_yvyra: 1,
      nightly_mberu: 2,
      nightly_tatu: 3,
      cleaning_fee: 4,
      base_guests: 5,
      extra_guest_fee: 6,
    });
    expect(s).toEqual({
      nightly: { yvyra: 1, mberu: 2, tatu: 3 },
      cleaningFee: 4,
      baseGuests: 5,
      extraGuestFee: 6,
    });
    expect(settingsToRow(s)).toEqual({
      nightly_yvyra: 1,
      nightly_mberu: 2,
      nightly_tatu: 3,
      cleaning_fee: 4,
      base_guests: 5,
      extra_guest_fee: 6,
    });
  });
});

describe("parseRateSettingsInput", () => {
  it("acepta valores válidos y los convierte a enteros", () => {
    const r = parseRateSettingsInput(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        nightly: { yvyra: 210000, mberu: 195000, tatu: 140000 },
        cleaningFee: 35000,
        baseGuests: 4,
        extraGuestFee: 15000,
      });
    }
  });

  it("acepta limpieza y huésped extra en 0 (gratis)", () => {
    const r = parseRateSettingsInput({ ...VALID, cleaning_fee: "0", extra_guest_fee: "0" });
    expect(r.ok).toBe(true);
  });

  it.each([
    ["0", "nightly en 0"],
    ["-5000", "nightly negativo"],
    ["abc", "nightly no numérico"],
    ["130000.5", "nightly con decimales"],
    ["", "nightly vacío"],
  ])("rechaza nightly_tatu=%s (%s)", (v) => {
    expect(parseRateSettingsInput({ ...VALID, nightly_tatu: v }).ok).toBe(false);
  });

  it("rechaza limpieza negativa", () => {
    expect(parseRateSettingsInput({ ...VALID, cleaning_fee: "-1" }).ok).toBe(false);
  });

  it("rechaza montos absurdos (anti-tipeo)", () => {
    expect(parseRateSettingsInput({ ...VALID, nightly_yvyra: "999999999999" }).ok).toBe(false);
  });

  it.each(["0", "21", "2.5", "x"])("rechaza base_guests=%s", (v) => {
    expect(parseRateSettingsInput({ ...VALID, base_guests: v }).ok).toBe(false);
  });
});
