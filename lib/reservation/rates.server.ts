import { UNITS, type Unit } from "@/lib/units";
import { getAvailabilityServer } from "./availability.server";
import { getRateSettings } from "./rate-settings.server";
import { computeNights, computeTotal } from "./pricing";
import { methodRates, methodTotal, transferSavings } from "./method-pricing";
import { parseDateOnly, formatDateOnly } from "./booking";

// Los montos públicos son PRECIO DE LISTA = método tarjeta (comisión incluida,
// ver method-pricing.ts); transferTotal/savings alimentan la línea de ahorro.
export type UnitRate = {
  unit: Unit;
  available: boolean;
  nights: number;
  nightly: number;
  cleaningFee: number;
  total: number;
  transferTotal: number;
  savings: number;
};

/** Para cada unidad: ¿libre [checkIn, checkOut)? + total del rango. Fail-open por unidad. */
export async function getRatesForRange(checkIn: string, checkOut: string, guests: number): Promise<UnitRate[]> {
  const from = parseDateOnly(checkIn);
  const to = parseDateOnly(checkOut);
  const nights = computeNights(from, to);
  const settings = await getRateSettings();
  const card = methodRates(settings, "card");

  return Promise.all(
    UNITS.map(async (unit): Promise<UnitRate> => {
      const nightly = card.nightly[unit.slug];
      const total = computeTotal(nightly, nights, card.cleaningFee);
      const transferTotal = methodTotal(settings, "transfer", unit.slug, nights);
      const savings = transferSavings(settings, unit.slug, nights);
      const base = { unit, nights, nightly, cleaningFee: card.cleaningFee, total, transferTotal, savings };
      if (nights <= 0) return { ...base, available: false };
      const { disabledDates } = await getAvailabilityServer(unit.slug, { from, to });
      const busy = new Set(disabledDates.map(formatDateOnly));
      let available = true;
      for (let i = 0; i < nights; i++) {
        const night = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
        if (busy.has(formatDateOnly(night))) {
          available = false;
          break;
        }
      }
      return { ...base, available };
    }),
  );
}
