import { describe, it, expect } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  isBookingMode,
  parseSiteSettingsInput,
  rowToSiteSettings,
  siteSettingsToRow,
} from "@/lib/site-settings";

describe("DEFAULT_SITE_SETTINGS", () => {
  it("arranca cerrado: el default es whatsapp, nunca online", () => {
    expect(DEFAULT_SITE_SETTINGS.bookingMode).toBe("whatsapp");
  });
});

describe("isBookingMode", () => {
  it("acepta solo los dos modos válidos", () => {
    expect(isBookingMode("whatsapp")).toBe(true);
    expect(isBookingMode("online")).toBe(true);
  });

  it("rechaza cualquier otra cosa", () => {
    for (const v of ["", "ONLINE", "wa", null, undefined, 1, {}]) {
      expect(isBookingMode(v)).toBe(false);
    }
  });
});

describe("rowToSiteSettings", () => {
  it("mapea una fila válida", () => {
    expect(rowToSiteSettings({ booking_mode: "online" })).toEqual({ bookingMode: "online" });
  });

  it("cae al default si la columna falta o trae basura", () => {
    expect(rowToSiteSettings({}).bookingMode).toBe("whatsapp");
    expect(rowToSiteSettings({ booking_mode: null }).bookingMode).toBe("whatsapp");
    expect(rowToSiteSettings({ booking_mode: "cualquiera" }).bookingMode).toBe("whatsapp");
  });
});

describe("siteSettingsToRow", () => {
  it("es el inverso de rowToSiteSettings", () => {
    const s = { bookingMode: "online" } as const;
    expect(rowToSiteSettings(siteSettingsToRow(s))).toEqual(s);
  });
});

describe("parseSiteSettingsInput", () => {
  it("acepta los modos válidos y limpia espacios", () => {
    expect(parseSiteSettingsInput({ booking_mode: " online " })).toEqual({
      ok: true,
      value: { bookingMode: "online" },
    });
  });

  it("rechaza un modo inválido con mensaje legible", () => {
    const r = parseSiteSettingsInput({ booking_mode: "apagado" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/modo/i);
  });
});
