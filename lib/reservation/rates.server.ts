import { UNITS, type Unit } from "@/lib/units";
import { getAvailabilityServer } from "./availability.server";
import { getRateSettings } from "./rate-settings.server";
import { computeNights, computeTotal } from "./pricing";
import { parseDateOnly, formatDateOnly } from "./booking";

export type UnitRate = {
  unit: Unit;
  available: boolean;
  nights: number;
  nightly: number;
  cleaningFee: number;
  total: number;
};

/** Para cada unidad: ¿libre [checkIn, checkOut)? + total del rango. Fail-open por unidad. */
export async function getRatesForRange(checkIn: string, checkOut: string, guests: number): Promise<UnitRate[]> {
  const from = parseDateOnly(checkIn);
  const to = parseDateOnly(checkOut);
  const nights = computeNights(from, to);
  const settings = await getRateSettings();

  return Promise.all(
    UNITS.map(async (unit): Promise<UnitRate> => {
      const nightly = settings.nightly[unit.slug];
      const total = computeTotal(nightly, nights, settings.cleaningFee);
      if (nights <= 0) return { unit, available: false, nights, nightly, cleaningFee: settings.cleaningFee, total };
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
      return { unit, available, nights, nightly, cleaningFee: settings.cleaningFee, total };
    }),
  );
}
