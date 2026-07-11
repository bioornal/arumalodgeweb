import { NextResponse } from "next/server";
import { getPayment, verifyWebhookSignature } from "@/lib/reservation/payments.server";
import {
  isRangeAvailable,
  createBookingEvent,
  findBookingEventByCode,
} from "@/lib/reservation/calendar.server";
import { upsertConfirmedByCode, type Locale } from "@/lib/reservation/reservations.server";
import { sendConfirmationEmailOnce } from "@/lib/reservation/email.server";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["yvyra", "mberu", "tatu"];

export async function POST(req: Request) {
  let body: { type?: string; data?: { id?: string } };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const dataId = body.data?.id;
  if (!dataId) return NextResponse.json({ ok: true }); // nada que procesar

  const ok = verifyWebhookSignature({
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId: String(dataId),
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  });
  if (!ok) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  if (body.type !== "payment") return NextResponse.json({ ok: true });

  let payment;
  try {
    payment = await getPayment(String(dataId));
  } catch (err) {
    console.error("[webhook] getPayment fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "fetch" }, { status: 502 });
  }

  if (payment.status !== "approved") return NextResponse.json({ ok: true });

  const m = (payment.metadata ?? {}) as Record<string, unknown>;
  const unitId = m.unit_id;
  const code = payment.externalReference;
  if (typeof unitId !== "string" || !(VALID_UNITS as string[]).includes(unitId) || !code) {
    return NextResponse.json({ ok: true }); // metadata incompleta; nada que hacer
  }

  try {
    const existing = await findBookingEventByCode(unitId as UnitId, code);

    const upsertInput = {
      code,
      unitId: unitId as UnitId,
      unitName: String(m.unit_name),
      checkIn: String(m.check_in),
      checkOut: String(m.check_out),
      nights: Number(m.nights),
      guests: Number(m.guests),
      firstName: String(m.first_name),
      lastName: String(m.last_name),
      email: String(m.email),
      phone: String(m.phone ?? ""),
      total: Number(m.total),
      paymentId: String(payment.id),
      locale: (m.locale === "en" || m.locale === "pt" ? m.locale : "es") as Locale,
    };

    if (existing) {
      // idempotente: no recrea el evento, pero igual refleja el estado en Supabase
      try {
        await upsertConfirmedByCode({ ...upsertInput, calendarEventId: existing.eventId });
      } catch (err) {
        console.error("[webhook] persist supabase (idempotente) fallo:", err instanceof Error ? err.message : err);
      }
      try { await sendConfirmationEmailOnce(code); }
      catch (err) { console.error("[webhook] email fallo:", err instanceof Error ? err.message : err); }
      return NextResponse.json({ ok: true });
    }

    const available = await isRangeAvailable(unitId as UnitId, {
      from: String(m.check_in),
      to: String(m.check_out),
    });
    if (!available) {
      console.error(`[webhook] pago ${payment.id} aprobado pero fechas ocupadas (code ${code})`);
      return NextResponse.json({ ok: true }); // requiere intervención manual / reembolso
    }

    const ev = await createBookingEvent(unitId as UnitId, {
      unitName: String(m.unit_name),
      firstName: String(m.first_name),
      lastName: String(m.last_name),
      email: String(m.email),
      phone: String(m.phone ?? ""),
      guests: Number(m.guests),
      checkIn: String(m.check_in),
      checkOut: String(m.check_out),
      nights: Number(m.nights),
      total: Number(m.total),
      code,
      paymentId: payment.id,
    });

    try {
      await upsertConfirmedByCode({ ...upsertInput, calendarEventId: ev.eventId });
    } catch (err) {
      console.error("[webhook] persist supabase fallo:", err instanceof Error ? err.message : err);
    }
    try { await sendConfirmationEmailOnce(code); }
    catch (err) { console.error("[webhook] email fallo:", err instanceof Error ? err.message : err); }
  } catch (err) {
    console.error("[webhook] confirmación fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "confirm" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
