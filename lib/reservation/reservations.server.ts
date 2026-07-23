import { getServiceClient } from "@/lib/supabase/server";
import { generateBookingCode } from "@/lib/reservation/code";
import type { UnitId } from "./reducer";

export type ReservationStatus = "pending" | "confirmed" | "released";
export type PaymentMethod = "card" | "transfer";
export type Locale = "es" | "en" | "pt";

export type ReservationRow = {
  id: string;
  code: string;
  unit_id: string;
  unit_name: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  locale: string;
  confirmation_email_sent_at: string | null;
  total: number;
  payment_method: PaymentMethod;
  status: ReservationStatus;
  comprobante_path: string | null;
  payment_id: string | null;
  calendar_event_id: string | null;
  created_at: string;
  confirmed_at: string | null;
  updated_at: string;
};

export type InsertReservationInput = {
  code: string;
  unitId: UnitId;
  unitName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  total: number;
  paymentMethod: PaymentMethod;
  status: ReservationStatus;
  comprobantePath?: string;
  paymentId?: string;
  calendarEventId?: string;
  locale?: Locale;
};

function toRow(i: InsertReservationInput) {
  return {
    code: i.code,
    unit_id: i.unitId,
    unit_name: i.unitName,
    check_in: i.checkIn,
    check_out: i.checkOut,
    nights: i.nights,
    guests: i.guests,
    first_name: i.firstName,
    last_name: i.lastName,
    email: i.email,
    phone: i.phone || null,
    locale: i.locale ?? "es",
    total: i.total,
    payment_method: i.paymentMethod,
    status: i.status,
    comprobante_path: i.comprobantePath ?? null,
    payment_id: i.paymentId ?? null,
    calendar_event_id: i.calendarEventId ?? null,
  };
}

/** true si ya hay una reserva con ese código. Propaga el error de DB. */
export async function codeExists(code: string): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("reservations")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`codeExists: ${error.message}`);
  return data !== null;
}

/**
 * Código de reserva garantizado libre.
 *
 * `generateBookingCode` sortea sobre 32^4 ≈ 1M combinaciones sin mirar la base, y
 * reservations.code es UNIQUE. Hay que llamar a esto ANTES de crear el evento de
 * calendario y el pago de MP, porque ambos incrustan el código: cambiarlo después
 * del choque los desincronizaría. Verificando antes, si esto falla la ruta corta
 * sin haber cobrado.
 */
export async function generateUniqueBookingCode(attempts = 5): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const code = generateBookingCode();
    if (!(await codeExists(code))) return code;
  }
  throw new Error(
    `generateUniqueBookingCode: no se encontró un código libre en ${attempts} intentos`,
  );
}

export async function insertReservation(input: InsertReservationInput): Promise<void> {
  const { error } = await getServiceClient().from("reservations").insert(toRow(input));
  if (error) throw new Error(`insertReservation: ${error.message}`);
}

/** Idempotente por `code`: usado por el webhook (puede reintentarse). */
export async function upsertConfirmedByCode(input: {
  code: string; unitId: UnitId; unitName: string; checkIn: string; checkOut: string;
  nights: number; guests: number; firstName: string; lastName: string; email: string;
  phone: string; total: number; paymentId: string; calendarEventId: string;
  locale?: Locale;
}): Promise<void> {
  const row = {
    ...toRow({ ...input, paymentMethod: "card", status: "confirmed" }),
    confirmed_at: new Date().toISOString(),
  };
  const { error } = await getServiceClient()
    .from("reservations")
    .upsert(row, { onConflict: "code" });
  if (error) throw new Error(`upsertConfirmedByCode: ${error.message}`);
}

export async function listReservations(
  filter: ReservationStatus | "all",
): Promise<ReservationRow[]> {
  const base = getServiceClient().from("reservations").select("*");
  const q = filter === "all" ? base : base.eq("status", filter);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listReservations: ${error.message}`);
  return (data ?? []) as ReservationRow[];
}

export async function getReservationById(id: string): Promise<ReservationRow | null> {
  const { data, error } = await getServiceClient()
    .from("reservations").select("*").eq("id", id).single();
  if (error) return null;
  return data as ReservationRow;
}

export async function setReservationStatus(
  id: string, status: ReservationStatus,
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
  const { error } = await getServiceClient()
    .from("reservations").update(patch).eq("id", id);
  if (error) throw new Error(`setReservationStatus: ${error.message}`);
}

/**
 * Flip atómico exactly-once: marca confirmation_email_sent_at solo si estaba en null.
 * Devuelve la fila (para enviar el email) si este llamado ganó el flip, o null si
 * ya estaba marcada (otro proceso envió) o el code no existe.
 */
export async function markConfirmationEmailSent(
  code: string,
): Promise<ReservationRow | null> {
  const { data, error } = await getServiceClient()
    .from("reservations")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("code", code)
    .is("confirmation_email_sent_at", null)
    .select();
  if (error) throw new Error(`markConfirmationEmailSent: ${error.message}`);
  const rows = (data ?? []) as ReservationRow[];
  return rows.length > 0 ? rows[0] : null;
}
