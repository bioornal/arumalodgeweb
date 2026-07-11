export type RangeValue = { checkIn: Date | null; checkOut: Date | null };

/** Transición de rango por click de día (check-out exclusivo, ≥ 1 noche). */
export function pickDay(current: RangeValue, day: Date): RangeValue {
  const { checkIn, checkOut } = current;
  if (checkIn === null || checkOut !== null) return { checkIn: day, checkOut: null };
  if (day > checkIn) return { checkIn, checkOut: day };
  return { checkIn: day, checkOut: null };
}
