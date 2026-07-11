import type { UnitId } from "./reducer";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_UNITS: UnitId[] = ["yvyra", "mberu", "tatu"];

export type RateQuery = { checkIn: string; checkOut: string; guests: number };
export type CheckoutQuery = RateQuery & { unitId: UnitId };

type Raw = { checkIn?: string; checkOut?: string; guests?: string; unit?: string };

function parseGuests(v: string | undefined): number | null {
  if (v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
}

export function parseRateQuery(sp: Raw): RateQuery | null {
  const { checkIn, checkOut } = sp;
  if (!checkIn || !DATE_RE.test(checkIn)) return null;
  if (!checkOut || !DATE_RE.test(checkOut)) return null;
  if (checkOut <= checkIn) return null; // comparación lexicográfica YYYY-MM-DD
  const guests = parseGuests(sp.guests);
  if (guests === null) return null;
  return { checkIn, checkOut, guests };
}

export function parseCheckoutQuery(sp: Raw): CheckoutQuery | null {
  const base = parseRateQuery(sp);
  if (!base) return null;
  if (!sp.unit || !(VALID_UNITS as string[]).includes(sp.unit)) return null;
  return { ...base, unitId: sp.unit as UnitId };
}

export function buildTarifasUrl(q: RateQuery): string {
  return `/tarifas?checkIn=${q.checkIn}&checkOut=${q.checkOut}&guests=${q.guests}`;
}

export function buildCheckoutUrl(q: CheckoutQuery): string {
  return `/reservas?unit=${q.unitId}&checkIn=${q.checkIn}&checkOut=${q.checkOut}&guests=${q.guests}`;
}
