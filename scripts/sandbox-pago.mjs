// Prueba de pagos SANDBOX contra la app local (sin tarjetas reales).
//
// El sandbox de MP simula el estado del pago según el NOMBRE DEL TITULAR:
//   APRO=aprobado · CONT=pendiente · FUND=rechazo fondos · OTHE=rechazo general
//   CALL=rechazo llamar · SECU=rechazo cvv · EXPI=rechazo vencimiento · DUPL=duplicado
//
// El token se crea server-side con el Access Token TEST (Bearer) porque la
// tokenización del navegador (public key) ya no funciona en sandbox (MP 2026).
//
// Uso (con `pnpm dev` corriendo):
//   node scripts/sandbox-pago.mjs pagar APRO 2027-05-01 2027-05-03 [yvyra|mberu|tatu] [huespedes]
//   node scripts/sandbox-pago.mjs borrar ARM-2026-XXXX   ← limpia la reserva de prueba (Supabase + Calendar)
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const AT = env.MERCADOPAGO_ACCESS_TOKEN;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const [cmd, ...args] = process.argv.slice(2);

if (!AT?.startsWith("TEST-")) {
  console.error("⚠ MERCADOPAGO_ACCESS_TOKEN no es TEST- — este script es solo para sandbox.");
  process.exit(1);
}

async function pagar([holder = "APRO", checkIn, checkOut, unitId = "yvyra", guests = "2"]) {
  if (!checkIn || !checkOut) {
    console.error("Uso: node scripts/sandbox-pago.mjs pagar APRO 2027-05-01 2027-05-03 [unidad] [huespedes]");
    process.exit(1);
  }
  // El sandbox de MP a veces "pierde" el token recién creado (2006 Card Token
  // not found) — flakiness conocido solo de sandbox. Reintentamos con token nuevo.
  let res, body;
  for (let intento = 1; intento <= 4; intento++) {
    const tokRes = await fetch("https://api.mercadopago.com/v1/card_tokens", {
      method: "POST",
      headers: { Authorization: `Bearer ${AT}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        card_number: "5031755734530604",
        expiration_month: 11,
        expiration_year: 2030,
        security_code: "123",
        cardholder: { name: holder, identification: { type: "DNI", number: "12345678" } },
      }),
    });
    const tok = await tokRes.json();
    if (!tok.id) { console.error("tokenización falló:", tok); process.exit(1); }
    await new Promise((r) => setTimeout(r, 1500));

    res = await fetch(`${APP_URL}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId, checkIn, checkOut, guests: Number(guests),
        firstName: "Prueba", lastName: `Sandbox ${holder}`,
        email: "comprador.prueba.aruma@gmail.com", phone: "+543751000000", locale: "es",
        payment: { token: tok.id, paymentMethodId: "master", installments: 1 },
      }),
    });
    body = await res.json();
    if (!(res.status === 502 && body.error === "payment")) break;
    console.log(`(intento ${intento}: el sandbox perdió el token, pruebo con uno nuevo…)`);
  }
  console.log(`HTTP ${res.status}`, body);
  if (body.code) console.log(`→ Para limpiar: node scripts/sandbox-pago.mjs borrar ${body.code}`);
}

async function borrar([code]) {
  if (!code) { console.error("Uso: node scripts/sandbox-pago.mjs borrar ARM-2026-XXXX"); process.exit(1); }
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const sbHeaders = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

  const rows = await (await fetch(
    `${sbUrl}/rest/v1/reservations?code=eq.${code}&select=code,unit_id,calendar_event_id`,
    { headers: sbHeaders },
  )).json();
  if (!rows.length) { console.log("No existe esa reserva en Supabase."); return; }
  const { unit_id, calendar_event_id } = rows[0];

  if (calendar_event_id) {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const calendarId = env[`ARUMA_CAL_${unit_id.toUpperCase()}`];
    const b64url = (b) => Buffer.from(b).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
      iss: sa.client_email, scope: "https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
    }))}`;
    const jwt = `${unsigned}.${b64url(crypto.sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key))}`;
    const { access_token } = await (await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
    })).json();
    const del = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${calendar_event_id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${access_token}` } },
    );
    console.log(`evento Calendar (${unit_id}):`, del.status === 204 || del.status === 410 ? "borrado" : `HTTP ${del.status}`);
  }

  const del = await fetch(`${sbUrl}/rest/v1/reservations?code=eq.${code}`, { method: "DELETE", headers: sbHeaders });
  console.log("fila Supabase:", del.status === 204 ? "borrada" : `HTTP ${del.status}`);
}

if (cmd === "pagar") await pagar(args);
else if (cmd === "borrar") await borrar(args);
else { console.error("Comandos: pagar | borrar"); process.exit(1); }
