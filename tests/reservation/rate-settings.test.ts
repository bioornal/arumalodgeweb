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
  card_fee_pct: "7.7",
  transfer_fee_pct: "5",
};

describe("DEFAULT_RATE_SETTINGS", () => {
  it("espeja los valores históricos de lib/units (fallback seguro)", () => {
    for (const u of UNITS) {
      expect(DEFAULT_RATE_SETTINGS.nightly[u.slug]).toBe(u.price);
    }
    expect(DEFAULT_RATE_SETTINGS.cleaningFee).toBe(CLEANING_FEE);
    expect(DEFAULT_RATE_SETTINGS.baseGuests).toBe(BASE_GUESTS);
    expect(DEFAULT_RATE_SETTINGS.extraGuestFee).toBe(0);
    expect(DEFAULT_RATE_SETTINGS.cardFeePct).toBe(7.7);
    expect(DEFAULT_RATE_SETTINGS.transferFeePct).toBe(5);
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
      card_fee_pct: 8.5,
      transfer_fee_pct: 4.25,
    });
    expect(s).toEqual({
      nightly: { yvyra: 1, mberu: 2, tatu: 3 },
      cleaningFee: 4,
      baseGuests: 5,
      extraGuestFee: 6,
      cardFeePct: 8.5,
      transferFeePct: 4.25,
    });
    expect(settingsToRow(s)).toEqual({
      nightly_yvyra: 1,
      nightly_mberu: 2,
      nightly_tatu: 3,
      cleaning_fee: 4,
      base_guests: 5,
      extra_guest_fee: 6,
      card_fee_pct: 8.5,
      transfer_fee_pct: 4.25,
    });
  });

  it("columnas de % ausentes o string (numeric de Postgres) → defaults / parseo", () => {
    const base = {
      nightly_yvyra: 1, nightly_mberu: 2, nightly_tatu: 3,
      cleaning_fee: 4, base_guests: 5, extra_guest_fee: 6,
    };
    // ALTER aún no corrido: columnas ausentes → defaults (nada de NaN)
    const sinCols = rowToSettings(base);
    expect(sinCols.cardFeePct).toBe(7.7);
    expect(sinCols.transferFeePct).toBe(5);
    // numeric puede llegar como string
    const conStrings = rowToSettings({ ...base, card_fee_pct: "6.29", transfer_fee_pct: "5.00" });
    expect(conStrings.cardFeePct).toBe(6.29);
    expect(conStrings.transferFeePct).toBe(5);
    // valores absurdos en DB → defaults
    const absurdo = rowToSettings({ ...base, card_fee_pct: 99, transfer_fee_pct: -1 });
    expect(absurdo.cardFeePct).toBe(7.7);
    expect(absurdo.transferFeePct).toBe(5);
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
        cardFeePct: 7.7,
        transferFeePct: 5,
      });
    }
  });

  it("acepta % con coma decimal y % en 0", () => {
    const r = parseRateSettingsInput({ ...VALID, card_fee_pct: "6,29", transfer_fee_pct: "0" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.cardFeePct).toBe(6.29);
      expect(r.value.transferFeePct).toBe(0);
    }
  });

  it.each(["-1", "31", "x", ""])("rechaza card_fee_pct=%s", (v) => {
    expect(parseRateSettingsInput({ ...VALID, card_fee_pct: v }).ok).toBe(false);
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
