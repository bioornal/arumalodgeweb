"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { parseSiteSettingsInput } from "@/lib/site-settings";
import { saveSiteSettings } from "@/lib/site-settings.server";

export type SaveModeState = { ok?: boolean; error?: string } | undefined;

export async function saveBookingMode(
  _prev: SaveModeState,
  formData: FormData,
): Promise<SaveModeState> {
  const parsed = parseSiteSettingsInput({
    booking_mode: String(formData.get("booking_mode") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };

  try {
    await saveSiteSettings(parsed.value);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el bloque de site_settings del setup.sql en el SQL Editor?",
    };
  }

  // Las páginas de departamentos son estáticas (prerender): sin revalidar
  // seguirían sirviendo el HTML viejo con los CTAs del modo anterior.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/tarifas`);
    revalidatePath(`/${locale}/reservas`);
    for (const u of UNITS) revalidatePath(`/${locale}/departamentos/${u.slug}`);
  }

  return { ok: true };
}
