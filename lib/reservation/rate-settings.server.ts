import { getServiceClient } from "@/lib/supabase/server";
import {
  DEFAULT_RATE_SETTINGS,
  rowToSettings,
  settingsToRow,
  type RateSettings,
  type RateSettingsRow,
} from "./rate-settings";

// Solo server. Lee/escribe la fila única (id=1) de public.rate_settings.
//
// Fail-safe: cualquier error de DB (tabla inexistente, red caída, env faltante)
// devuelve los defaults de lib/units.ts → el sitio público nunca rompe.
//
// Cache: memo en módulo con TTL corto (30s) — evita un SELECT por request sin
// depender de next/cache (así también funciona en tests y scripts). Tras guardar
// desde el admin se invalida el memo y se revalidan las páginas con precios
// (ver app/admin/tarifas/actions.ts), así que el delay máximo es el TTL.

const TTL_MS = 30_000;
let memo: { at: number; value: RateSettings } | null = null;

export function invalidateRateSettingsCache(): void {
  memo = null;
}

export async function getRateSettings(): Promise<RateSettings> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  try {
    const { data, error } = await getServiceClient()
      .from("rate_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = data ? rowToSettings(data as RateSettingsRow) : DEFAULT_RATE_SETTINGS;
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return memo?.value ?? DEFAULT_RATE_SETTINGS;
  }
}

export async function saveRateSettings(s: RateSettings): Promise<void> {
  const { error } = await getServiceClient()
    .from("rate_settings")
    .upsert({ id: 1, ...settingsToRow(s) });
  if (error) throw new Error(`saveRateSettings: ${error.message}`);
  invalidateRateSettingsCache();
}
