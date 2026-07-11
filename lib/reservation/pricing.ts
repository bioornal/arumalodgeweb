import { differenceInCalendarDays } from "date-fns";

export function computeNights(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const n = differenceInCalendarDays(checkOut, checkIn);
  return n > 0 ? n : 0;
}
export function computeSubtotal(pricePerNight: number, nights: number): number {
  return pricePerNight * nights;
}
export function computeTotal(pricePerNight: number, nights: number, cleaningFee: number): number {
  return nights > 0 ? computeSubtotal(pricePerNight, nights) + cleaningFee : 0;
}
