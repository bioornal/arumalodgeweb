import { getServiceClient } from "@/lib/supabase/server";
import { resolveBookingMode } from "@/lib/booking-mode";
import {
  DEFAULT_SITE_SETTINGS,
  rowToSiteSettings,
  siteSettingsToRow,
  type BookingMode,
  type SiteSettings,
  type SiteSettingsRow,
} from "./site-settings";

// Solo server. Lee/escribe la fila única (id=1) de public.site_settings.
//
// FAIL-SAFE ASIMÉTRICO — la diferencia importante con rate-settings.server.ts:
// ante un error NO devolvemos el valor memoizado, devolvemos el default cerrado.
// Un memo con "online" sobreviviendo a una caída de Supabase dejaría el checkout
// abierto sin poder confirmar el estado real. Un blip de red cierra la reserva
// unos segundos y se recupera solo: es la dirección barata del error.
//
// Cache: memo en módulo con TTL corto (30s), igual que rate-settings — evita un
// SELECT por request sin depender de next/cache. Tras guardar desde el admin se
// invalida el memo y se revalidan las páginas (ver app/admin/configuracion/actions.ts).

const TTL_MS = 30_000;
let memo: { at: number; value: SiteSettings } | null = null;

export function invalidateSiteSettingsCache(): void {
  memo = null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  try {
    const { data, error } = await getServiceClient()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = data ? rowToSiteSettings(data as SiteSettingsRow) : DEFAULT_SITE_SETTINGS;
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * El modo EFECTIVO del sitio: lo que dice la DB, salvo que la env var lo fuerce.
 * Es el punto de entrada único para páginas y rutas de API — no llamar a
 * getSiteSettings() directo para decidir si se puede cobrar.
 */
export async function getBookingMode(): Promise<BookingMode> {
  const settings = await getSiteSettings();
  return resolveBookingMode(settings.bookingMode);
}

export async function saveSiteSettings(s: SiteSettings): Promise<void> {
  const { error } = await getServiceClient()
    .from("site_settings")
    .upsert({ id: 1, ...siteSettingsToRow(s) });
  if (error) throw new Error(`saveSiteSettings: ${error.message}`);
  invalidateSiteSettingsCache();
}
