import { NextResponse } from "next/server";
import { isRangeAvailable, createBookingEvent } from "@/lib/reservation/calendar.server";
import {
  createCardPayment,
  mockPayment,
  isMockMode,
  type PaymentOutcome,
} from "@/lib/reservation/payments.server";
import { generateBookingCode } from "@/lib/reservation/code";
import { getUnit } from "@/lib/units";
import { computeNights } from "@/lib/reservation/pricing";
import { methodTotal } from "@/lib/reservation/method-pricing";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { isValidEmail } from "@/lib/reservation/validation";
import { insertReservation } from "@/lib/reservation/reservations.server";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { getBookingMode } from "@/lib/site-settings.server";
import { sendConfirmationEmailOnce } from "@/lib/reservation/email.server";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["yvyra", "mberu", "tatu"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isUnitId(v: unknown): v is UnitId {
  return typeof v === "string" && (VALID_UNITS as string[]).includes(v);
}

type CardPayment = { token: string; paymentMethodId: string; issuerId?: string; installments: number; deviceId?: string };
type MockPay = { mockOutcome: "approved" | "pending" | "rejected" };

function isCardPayment(v: unknown): v is CardPayment {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.token === "string" && typeof p.paymentMethodId === "string" && typeof p.installments === "number";
}
function isMockPay(v: unknown): v is MockPay {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return p.mockOutcome === "approved" || p.mockOutcome === "pending" || p.mockOutcome === "rejected";
}

export async function POST(req: Request) {
  // 10 intentos de cobro por minuto por IP: un huésped legítimo reintenta 2 o 3
  // veces si le rebota la tarjeta, nunca diez.
  if (rateLimited("payments", clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Reservas online pausadas (modo WhatsApp): no se cobra.
  // Se lee server-side: el cliente nunca decide si se puede cobrar.
  if (isWhatsAppBookingMode(await getBookingMode())) {
    return NextResponse.json({ error: "bookings_paused" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const { unitId, checkIn, checkOut, guests, firstName, lastName, email, phone, payment, locale: localeRaw } = body;
  const locale = localeRaw === "en" || localeRaw === "pt" ? localeRaw : "es";

  if (
    !isUnitId(unitId) ||
    typeof checkIn !== "string" || !DATE_RE.test(checkIn) ||
    typeof checkOut !== "string" || !DATE_RE.test(checkOut) ||
    checkOut <= checkIn ||
    typeof guests !== "number" || !Number.isInteger(guests) || guests < 1 ||
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof email !== "string" || !isValidEmail(email)
  ) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const unit = getUnit(unitId)!;
  if (guests > unit.specs.guests) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const phoneStr = typeof phone === "string" ? phone : "";

  // El método de pago: tarjeta, o mock (solo si el server está en modo test).
  const useMock = isMockMode() && isMockPay(payment);
  if (!useMock && !isCardPayment(payment)) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const nights = computeNights(new Date(checkIn), new Date(checkOut));
  const settings = await getRateSettings();
  // Precio de lista = método tarjeta (comisión MP incluida; ver method-pricing.ts)
  const total = methodTotal(settings, "card", unit.slug, nights);

  // Re-chequeo en tiempo real (fail-closed)
  let available: boolean;
  try {
    available = await isRangeAvailable(unitId, { from: checkIn, to: checkOut });
  } catch (err) {
    console.error("[payments] re-chequeo fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "calendar" }, { status: 502 });
  }
  if (!available) {
    return NextResponse.json({ error: "conflict" }, { status: 409 });
  }

  const code = generateBookingCode();
  const metadata = {
    unit_id: unitId,
    unit_name: unit.name,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phoneStr,
    guests,
    check_in: checkIn,
    check_out: checkOut,
    nights,
    total,
    locale,
  };

  // Cobro (real o emulado)
  let outcome: PaymentOutcome;
  try {
    if (useMock) {
      outcome = mockPayment((payment as MockPay).mockOutcome, code);
    } else {
      const card = payment as CardPayment;
      const base = process.env.NEXT_PUBLIC_SITE_URL;
      outcome = await createCardPayment({
        amount: total,
        token: card.token,
        paymentMethodId: card.paymentMethodId,
        issuerId: card.issuerId,
        installments: card.installments,
        payerEmail: email as string,
        payerFirstName: firstName as string,
        payerLastName: lastName as string,
        description: `Reserva ${unit.name} ${checkIn}→${checkOut}`,
        code,
        metadata,
        notificationUrl: base ? `${base}/api/webhooks/mercadopago` : undefined,
        statementDescriptor: "ARUMALODGE",
        deviceId: card.deviceId,
        items: [
          {
            id: unitId,
            title: `Reserva ${unit.name}`,
            description: `${nights} noche(s), ${checkIn} → ${checkOut}, ${guests} huésped(es)`,
            categoryId: "travels",
            quantity: 1,
            unitPrice: total,
          },
        ],
      });
    }
  } catch (err) {
    console.error("[payments] cobro fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "payment" }, { status: 502 });
  }

  if (outcome.status === "approved") {
    let ev: { eventId: string };
    try {
      ev = await createBookingEvent(unitId, {
        unitName: unit.name,
        firstName: firstName as string,
        lastName: lastName as string,
        email: email as string,
        phone: phoneStr,
        guests: guests as number,
        checkIn,
        checkOut,
        nights,
        total,
        code,
        paymentId: outcome.id,
      });
    } catch (err) {
      console.error("[payments] insert fallo:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "calendar" }, { status: 502 });
    }
    try {
      await insertReservation({
        code, unitId, unitName: unit.name, checkIn, checkOut, nights,
        guests: guests as number, firstName: firstName as string, lastName: lastName as string,
        email: email as string, phone: phoneStr, total,
        paymentMethod: "card", status: "confirmed",
        paymentId: outcome.id, calendarEventId: ev.eventId,
        locale,
      });
    } catch (err) {
      console.error("[payments] persist supabase (approved) fallo:", err instanceof Error ? err.message : err);
    }
    try { await sendConfirmationEmailOnce(code); }
    catch (err) { console.error("[payments] email fallo:", err instanceof Error ? err.message : err); }
    return NextResponse.json({ status: "approved", code, unitId, checkIn, checkOut, guests, total });
  }

  if (outcome.status === "pending" || outcome.status === "in_process") {
    try {
      await insertReservation({
        code, unitId, unitName: unit.name, checkIn, checkOut, nights,
        guests: guests as number, firstName: firstName as string, lastName: lastName as string,
        email: email as string, phone: phoneStr, total,
        paymentMethod: "card", status: "pending", paymentId: outcome.id,
        locale,
      });
    } catch (err) {
      console.error("[payments] persist supabase (pending) fallo:", err instanceof Error ? err.message : err);
    }
    return NextResponse.json({ status: "pending", code });
  }

  return NextResponse.json({ status: "rejected", detail: outcome.statusDetail ?? null });
}
