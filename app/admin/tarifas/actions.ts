"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { parseRateSettingsInput, type RateSettingsInput } from "@/lib/reservation/rate-settings";
import { saveRateSettings } from "@/lib/reservation/rate-settings.server";

export type SaveRatesState = { ok?: boolean; error?: string } | undefined;

export async function saveRates(
  _prev: SaveRatesState,
  formData: FormData,
): Promise<SaveRatesState> {
  const raw = {
    nightly_yvyra: String(formData.get("nightly_yvyra") ?? ""),
    nightly_mberu: String(formData.get("nightly_mberu") ?? ""),
    nightly_tatu: String(formData.get("nightly_tatu") ?? ""),
    cleaning_fee: String(formData.get("cleaning_fee") ?? ""),
    base_guests: String(formData.get("base_guests") ?? ""),
    extra_guest_fee: String(formData.get("extra_guest_fee") ?? ""),
    card_fee_pct: String(formData.get("card_fee_pct") ?? ""),
    transfer_fee_pct: String(formData.get("transfer_fee_pct") ?? ""),
  } satisfies RateSettingsInput;

  const parsed = parseRateSettingsInput(raw);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await saveRateSettings(parsed.value);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el bloque de rate_settings del setup.sql en el SQL Editor?",
    };
  }

  // Las páginas de departamentos son estáticas (prerender): hay que revalidarlas
  // para que el HTML con los precios nuevos se regenere. Tarifas/reservas son
  // dinámicas, pero las revalidamos igual por las dudas.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/tarifas`);
    revalidatePath(`/${locale}/reservas`);
    for (const u of UNITS) revalidatePath(`/${locale}/departamentos/${u.slug}`);
  }

  return { ok: true };
}
