import { NextResponse } from "next/server";
import { isRangeAvailable, createPendingEvent, deleteEvent } from "@/lib/reservation/calendar.server";
import { uploadComprobante, removeComprobante, isAllowedMime, MAX_BYTES } from "@/lib/reservation/comprobante.server";
import { insertReservation } from "@/lib/reservation/reservations.server";
import { generateBookingCode } from "@/lib/reservation/code";
import { getUnit, CLEANING_FEE, pricePerNight } from "@/lib/units";
import { computeNights, computeTotal } from "@/lib/reservation/pricing";
import { isValidEmail } from "@/lib/reservation/validation";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["yvyra", "mberu", "tatu"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isUnitId(v: unknown): v is UnitId {
  return typeof v === "string" && (VALID_UNITS as string[]).includes(v);
}
function bad() {
  return NextResponse.json({ error: "validation" }, { status: 400 });
}

// `instanceof File` puede fallar entre realms (jsdom en tests vs. undici en runtime),
// así que se valida por forma: lo que necesita uploadComprobante (type + arrayBuffer) y size.
function isFileLike(v: unknown): v is File {
  if (typeof v !== "object" || v === null) return false;
  const f = v as { type?: unknown; size?: unknown; arrayBuffer?: unknown };
  return typeof f.type === "string" && typeof f.size === "number" && typeof f.arrayBuffer === "function";
}

export async function POST(req: Request) {
  // Reservas online pausadas (modo WhatsApp): no se aceptan reservas por transferencia.
  if (isWhatsAppBookingMode()) {
    return NextResponse.json({ error: "bookings_paused" }, { status: 503 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return bad();
  }

  const unitId = fd.get("unitId");
  const checkIn = fd.get("checkIn");
  const checkOut = fd.get("checkOut");
  const guestsRaw = fd.get("guests");
  const firstName = fd.get("firstName");
  const lastName = fd.get("lastName");
  const email = fd.get("email");
  const phoneRaw = fd.get("phone");
  const file = fd.get("comprobante");
  const localeRaw = fd.get("locale");
  const locale = localeRaw === "en" || localeRaw === "pt" ? localeRaw : "es";

  const guests = typeof guestsRaw === "string" ? Number(guestsRaw) : NaN;

  if (
    !isUnitId(unitId) ||
    typeof checkIn !== "string" || !DATE_RE.test(checkIn) ||
    typeof checkOut !== "string" || !DATE_RE.test(checkOut) ||
    checkOut <= checkIn ||
    !Number.isInteger(guests) || guests < 1 ||
    typeof firstName !== "string" || !firstName.trim() ||
    typeof lastName !== "string" || !lastName.trim() ||
    typeof email !== "string" || !isValidEmail(email)
  ) {
    return bad();
  }

  if (!isFileLike(file) || file.size === 0) return bad();
  if (!isAllowedMime(file.type)) return bad();
  if (file.size > MAX_BYTES) return bad();

  const phone = typeof phoneRaw === "string" ? phoneRaw : "";
  const unit = getUnit(unitId)!;
  if (guests > unit.specs.guests) return bad();
  const nights = computeNights(new Date(checkIn), new Date(checkOut));
  const total = computeTotal(pricePerNight(unit.slug, guests), nights, CLEANING_FEE);

  // 1. Re-chequeo de disponibilidad (fail-closed).
  let available: boolean;
  try {
    available = await isRangeAvailable(unitId, { from: checkIn, to: checkOut });
  } catch (err) {
    console.error("[transfer] re-chequeo fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "calendar" }, { status: 502 });
  }
  if (!available) return NextResponse.json({ error: "conflict" }, { status: 409 });

  const code = generateBookingCode();

  // 2. Subir comprobante.
  let comprobantePath: string;
  try {
    comprobantePath = await uploadComprobante(code, file);
  } catch (err) {
    console.error("[transfer] upload fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "storage" }, { status: 502 });
  }

  // 3. Crear evento PENDIENTE (bloquea fechas).
  let eventId: string;
  try {
    const ev = await createPendingEvent(unitId, {
      unitName: unit.name, firstName, lastName, email, phone, guests,
      checkIn, checkOut, nights, total, code, paymentId: "transfer",
    });
    eventId = ev.eventId;
  } catch (err) {
    console.error("[transfer] evento fallo:", err instanceof Error ? err.message : err);
    await removeComprobante(comprobantePath);
    return NextResponse.json({ error: "calendar" }, { status: 502 });
  }

  // 4. Insertar en Supabase. Si falla, revertir evento + comprobante.
  try {
    await insertReservation({
      code, unitId, unitName: unit.name, checkIn, checkOut, nights, guests,
      firstName, lastName, email, phone, total,
      paymentMethod: "transfer", status: "pending",
      comprobantePath, calendarEventId: eventId,
      locale,
    });
  } catch (err) {
    console.error("[transfer] insert fallo:", err instanceof Error ? err.message : err);
    await deleteEvent(unitId, eventId);
    await removeComprobante(comprobantePath);
    return NextResponse.json({ error: "db" }, { status: 502 });
  }

  return NextResponse.json({ status: "pending", code });
}
