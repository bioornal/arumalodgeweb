// Configuración operativa del sitio, editable desde /admin/configuracion.
// Vive en Supabase (tabla site_settings, fila única id=1). Este módulo es la
// forma compartida (server + cliente + tests): sin imports de server.
//
// Espeja la estructura de lib/reservation/rate-settings.ts a propósito — mismo
// patrón, mismo fail-safe, misma separación entre módulo puro y .server.ts.

export type BookingMode = "whatsapp" | "online";

export type SiteSettings = {
  /** "whatsapp": reserva online pausada, los CTAs derivan a WhatsApp. */
  bookingMode: BookingMode;
};

// El default es el modo CERRADO. Si la DB no responde, si la tabla no existe,
// si la columna trae basura: el sitio no cobra. Nunca al revés.
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  bookingMode: "whatsapp",
};

export type SiteSettingsRow = {
  // Puede faltar si aún no se corrió el SQL de setup.
  booking_mode?: string | null;
};

export function isBookingMode(v: unknown): v is BookingMode {
  return v === "whatsapp" || v === "online";
}

export function rowToSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    bookingMode: isBookingMode(row.booking_mode)
      ? row.booking_mode
      : DEFAULT_SITE_SETTINGS.bookingMode,
  };
}

export function siteSettingsToRow(s: SiteSettings): SiteSettingsRow {
  return { booking_mode: s.bookingMode };
}

// ---- Validación de la entrada del formulario admin -------------------------

export type SiteSettingsInput = { booking_mode: string };

export function parseSiteSettingsInput(
  raw: SiteSettingsInput,
): { ok: true; value: SiteSettings } | { ok: false; error: string } {
  const mode = raw.booking_mode.trim();
  if (!isBookingMode(mode)) {
    return { ok: false, error: "Modo de reserva inválido: esperaba 'whatsapp' u 'online'." };
  }
  return { ok: true, value: { bookingMode: mode } };
}
