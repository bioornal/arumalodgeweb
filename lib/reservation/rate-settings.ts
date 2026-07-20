import { UNITS, CLEANING_FEE, BASE_GUESTS, type UnitSlug } from "@/lib/units";

// Tarifas editables desde /admin/tarifas. Viven en Supabase (tabla rate_settings);
// este módulo es la forma compartida (server + cliente + tests, sin imports de server).
//
// IMPORTANTE: el precio sigue siendo TARIFA PLANA por unidad. `baseGuests` y
// `extraGuestFee` se guardan para un futuro recargo por huésped, pero hoy NO
// entran en el cálculo del total (ver pricing.ts).
export type RateSettings = {
  nightly: Record<UnitSlug, number>;
  cleaningFee: number;
  baseGuests: number;
  extraGuestFee: number;
};

// Fallback si la DB no responde o aún no se corrió el SQL: los mismos valores
// que siempre estuvieron hardcodeados en lib/units.ts → el sitio nunca rompe.
export const DEFAULT_RATE_SETTINGS: RateSettings = {
  nightly: {
    yvyra: UNITS.find((u) => u.slug === "yvyra")!.price,
    mberu: UNITS.find((u) => u.slug === "mberu")!.price,
    tatu: UNITS.find((u) => u.slug === "tatu")!.price,
  },
  cleaningFee: CLEANING_FEE,
  baseGuests: BASE_GUESTS,
  extraGuestFee: 0,
};

// ---- Fila de Supabase ↔ RateSettings -------------------------------------

export type RateSettingsRow = {
  nightly_yvyra: number;
  nightly_mberu: number;
  nightly_tatu: number;
  cleaning_fee: number;
  base_guests: number;
  extra_guest_fee: number;
};

export function rowToSettings(row: RateSettingsRow): RateSettings {
  return {
    nightly: {
      yvyra: row.nightly_yvyra,
      mberu: row.nightly_mberu,
      tatu: row.nightly_tatu,
    },
    cleaningFee: row.cleaning_fee,
    baseGuests: row.base_guests,
    extraGuestFee: row.extra_guest_fee,
  };
}

export function settingsToRow(s: RateSettings): RateSettingsRow {
  return {
    nightly_yvyra: s.nightly.yvyra,
    nightly_mberu: s.nightly.mberu,
    nightly_tatu: s.nightly.tatu,
    cleaning_fee: s.cleaningFee,
    base_guests: s.baseGuests,
    extra_guest_fee: s.extraGuestFee,
  };
}

// ---- Validación de la entrada del formulario admin -------------------------

const MAX_ARS = 100_000_000; // techo anti-tipeo (100 palos)

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 0 || n > MAX_ARS) return null;
  return n;
}

export type RateSettingsInput = Record<keyof RateSettingsRow, string>;

/** Valida los campos del form de /admin/tarifas. Devuelve error legible o el valor listo para guardar. */
export function parseRateSettingsInput(
  raw: RateSettingsInput,
): { ok: true; value: RateSettings } | { ok: false; error: string } {
  const nightly: Record<UnitSlug, number> = { yvyra: 0, mberu: 0, tatu: 0 };
  for (const slug of ["yvyra", "mberu", "tatu"] as const) {
    const n = parseMoney(raw[`nightly_${slug}`]);
    if (n === null || n === 0) return { ok: false, error: "El precio por noche debe ser un entero mayor a 0." };
    nightly[slug] = n;
  }
  const cleaningFee = parseMoney(raw.cleaning_fee);
  if (cleaningFee === null) return { ok: false, error: "La tasa de limpieza debe ser un entero mayor o igual a 0." };
  const extraGuestFee = parseMoney(raw.extra_guest_fee);
  if (extraGuestFee === null) return { ok: false, error: "El cargo por huésped extra debe ser un entero mayor o igual a 0." };
  const baseGuests = Number(raw.base_guests.trim());
  if (!Number.isInteger(baseGuests) || baseGuests < 1 || baseGuests > 20) {
    return { ok: false, error: "Los huéspedes incluidos deben ser un entero entre 1 y 20." };
  }
  return { ok: true, value: { nightly, cleaningFee, baseGuests, extraGuestFee } };
}
