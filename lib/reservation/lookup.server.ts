import { getServiceClient } from "@/lib/supabase/server";
import { isValidEmail } from "./validation";
import type { ReservationStatus, PaymentMethod } from "./reservations.server";

export type ReservationView = {
  code: string;
  unitName: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  nights: number;
  guests: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: ReservationStatus;
};

const CODE_RE = /^ARM-\d{4}-[A-Z0-9]{4}$/;

/**
 * Busca una reserva por código + email. Devuelve una vista saneada (sin id ni
 * campos sensibles) o `null`. No distingue "no existe" de "email no coincide":
 * en ambos casos `null` (anti-enumeración, decidido en el route handler).
 * Sólo server: usa el service client (bypassa RLS).
 */
export async function findReservationForGuest(
  codeRaw: string,
  emailRaw: string,
): Promise<ReservationView | null> {
  const code = codeRaw.trim().toUpperCase();
  const email = emailRaw.trim().toLowerCase();
  if (!CODE_RE.test(code) || !isValidEmail(email)) return null;

  const { data, error } = await getServiceClient()
    .from("reservations")
    .select(
      "code, unit_name, check_in, check_out, nights, guests, total, payment_method, status, email",
    )
    .eq("code", code)
    .single();

  if (error || !data) return null;
  if (String(data.email).trim().toLowerCase() !== email) return null;

  return {
    code: data.code,
    unitName: data.unit_name,
    checkIn: data.check_in,
    checkOut: data.check_out,
    nights: data.nights,
    guests: data.guests,
    total: data.total,
    paymentMethod: data.payment_method,
    status: data.status,
  };
}
