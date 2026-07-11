import crypto from "node:crypto";
import type { UnitId } from "./reducer";

// Solo server. No importar desde código cliente.

const CAL_ENV_BY_UNIT: Record<UnitId, string> = {
  yvyra: "ARUMA_CAL_YVYRA",
  mberu: "ARUMA_CAL_MBERU",
  tatu: "ARUMA_CAL_TATU",
};

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };

export type BookingEventInput = {
  unitName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guests: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD (exclusivo)
  nights: number;
  total: number;
  code: string;
  paymentId: string;
};

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no configurado");
  return JSON.parse(raw) as ServiceAccount;
}

function resolveCalendarId(unitId: UnitId): string {
  const id = process.env[CAL_ENV_BY_UNIT[unitId]];
  if (!id) throw new Error(`Falta env ${CAL_ENV_BY_UNIT[unitId]}`);
  return id;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signature = b64url(crypto.sign("RSA-SHA256", Buffer.from(signingInput), sa.private_key));
  const assertion = `${signingInput}.${signature}`;
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

function eventsUrl(calId: string): string {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;
}

// Solapamiento de intervalos semiabiertos [start, end) sobre fechas YYYY-MM-DD
// (comparación lexicográfica, TZ-safe).
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function shiftDate(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

// Tamaño de página de events.list. La ventana es de pocos días para UNA unidad,
// así que jamás debería llenarse; si lo hace, no paginamos: fallamos cerrado.
const EVENTS_PAGE_SIZE = 250;

/** ¿Está libre [from, to) (noches) en el calendario de la unidad? Tiempo real. */
export async function isRangeAvailable(
  unitId: UnitId,
  range: { from: string; to: string },
): Promise<boolean> {
  const calId = resolveCalendarId(unitId);
  const token = await getAccessToken();
  const params = new URLSearchParams({
    timeMin: `${shiftDate(range.from, -1)}T00:00:00Z`,
    timeMax: `${shiftDate(range.to, 1)}T00:00:00Z`,
    singleEvents: "true",
    maxResults: String(EVENTS_PAGE_SIZE),
  });
  const res = await fetch(`${eventsUrl(calId)}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`events.list failed: ${res.status}`);
  const json = (await res.json()) as {
    items?: Array<{ start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } }>;
  };
  const items = json.items ?? [];
  // Página llena: pudo haber más eventos sin paginar. Fail-closed (camino del dinero):
  // ante incertidumbre, marcamos como NO disponible en vez de arriesgar doble-booking.
  if (items.length >= EVENTS_PAGE_SIZE) return false;
  for (const ev of items) {
    const evStart = ev.start?.date ?? ev.start?.dateTime?.slice(0, 10);
    const evEnd = ev.end?.date ?? ev.end?.dateTime?.slice(0, 10);
    if (!evStart || !evEnd) continue;
    if (overlaps(evStart, evEnd, range.from, range.to)) return false;
  }
  return true;
}

/** Inserta el evento de reserva pagada (bloquea las fechas, flag [CONFIRMADA]). */
export async function createBookingEvent(
  unitId: UnitId,
  input: BookingEventInput,
): Promise<{ eventId: string }> {
  const calId = resolveCalendarId(unitId);
  const token = await getAccessToken();
  const body = {
    summary: `[CONFIRMADA] ${input.unitName} — ${input.firstName} ${input.lastName}`,
    description: [
      `Código: ${input.code}`,
      `Huésped: ${input.firstName} ${input.lastName}`,
      `Email: ${input.email}`,
      `Teléfono: ${input.phone || "—"}`,
      `Huéspedes: ${input.guests}`,
      `Noches: ${input.nights}`,
      `Total: $${input.total}`,
      `Estado: pagado`,
      `Pago MP: ${input.paymentId}`,
    ].join("\n"),
    start: { date: input.checkIn },
    end: { date: input.checkOut },
    extendedProperties: {
      private: {
        code: input.code,
        email: input.email,
        phone: input.phone,
        guests: String(input.guests),
        status: "paid",
        paymentId: input.paymentId,
      },
    },
  };
  const res = await fetch(eventsUrl(calId), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`events.insert failed: ${res.status}`);
  const json = (await res.json()) as { id: string };
  return { eventId: json.id };
}

/** Busca un evento por su código de reserva (idempotencia). null si no existe. */
export async function findBookingEventByCode(
  unitId: UnitId,
  code: string,
): Promise<{ eventId: string } | null> {
  const calId = resolveCalendarId(unitId);
  const token = await getAccessToken();
  const params = new URLSearchParams({
    privateExtendedProperty: `code=${code}`,
    maxResults: "1",
  });
  const res = await fetch(`${eventsUrl(calId)}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`events.list(code) failed: ${res.status}`);
  const json = (await res.json()) as { items?: Array<{ id?: string }> };
  const item = (json.items ?? [])[0];
  return item?.id ? { eventId: item.id } : null;
}

function eventUrl(calId: string, eventId: string): string {
  return `${eventsUrl(calId)}/${encodeURIComponent(eventId)}`;
}

/** Inserta un evento PENDIENTE (transferencia sin verificar). Bloquea las fechas. */
export async function createPendingEvent(
  unitId: UnitId,
  input: BookingEventInput,
): Promise<{ eventId: string }> {
  const calId = resolveCalendarId(unitId);
  const token = await getAccessToken();
  const body = {
    summary: `[PENDIENTE] ${input.unitName} — ${input.firstName} ${input.lastName}`,
    description: [
      `Código: ${input.code}`,
      `Huésped: ${input.firstName} ${input.lastName}`,
      `Email: ${input.email}`,
      `Teléfono: ${input.phone || "—"}`,
      `Huéspedes: ${input.guests}`,
      `Noches: ${input.nights}`,
      `Total: $${input.total}`,
      `Estado: pendiente de verificación (transferencia)`,
    ].join("\n"),
    start: { date: input.checkIn },
    end: { date: input.checkOut },
    extendedProperties: {
      private: {
        code: input.code,
        email: input.email,
        phone: input.phone,
        guests: String(input.guests),
        status: "pending_transfer",
      },
    },
  };
  const res = await fetch(eventsUrl(calId), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`events.insert(pending) failed: ${res.status}`);
  const json = (await res.json()) as { id: string };
  return { eventId: json.id };
}

/** Marca un evento pendiente como confirmado ([CONFIRMADA] + status paid). */
export async function confirmEvent(unitId: UnitId, eventId: string): Promise<void> {
  const calId = resolveCalendarId(unitId);
  const token = await getAccessToken();
  // Leer el summary actual para reemplazar [PENDIENTE] → [CONFIRMADA].
  const getRes = await fetch(eventUrl(calId, eventId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!getRes.ok) throw new Error(`events.get failed: ${getRes.status}`);
  const ev = (await getRes.json()) as { summary?: string };
  const summary = (ev.summary ?? "").replace("[PENDIENTE]", "[CONFIRMADA]");
  const res = await fetch(eventUrl(calId, eventId), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary,
      extendedProperties: { private: { status: "paid" } },
    }),
  });
  if (!res.ok) throw new Error(`events.patch failed: ${res.status}`);
}

/** Borra un evento (libera las fechas). */
export async function deleteEvent(unitId: UnitId, eventId: string): Promise<void> {
  const calId = resolveCalendarId(unitId);
  const token = await getAccessToken();
  const res = await fetch(eventUrl(calId, eventId), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 410 Gone = ya borrado → idempotente.
  if (!res.ok && res.status !== 410) throw new Error(`events.delete failed: ${res.status}`);
}
