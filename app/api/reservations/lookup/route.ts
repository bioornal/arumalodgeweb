import { NextResponse } from "next/server";
import { findReservationForGuest } from "@/lib/reservation/lookup.server";
import { isValidEmail } from "@/lib/reservation/validation";

// Rate-limit best-effort por IP. En serverless el contador es por-instancia
// (no es una garantía dura); suficiente para el volumen del lodge (3 unidades).
const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now > e.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > MAX_HITS;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : "unknown";
}

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { code?: unknown; email?: unknown };
  try {
    body = (await req.json()) as { code?: unknown; email?: unknown };
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const { code, email } = body;
  if (
    typeof code !== "string" || !code.trim() ||
    typeof email !== "string" || !isValidEmail(email)
  ) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  let reservation;
  try {
    reservation = await findReservationForGuest(code, email);
  } catch (err) {
    console.error("[lookup] fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (!reservation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ reservation });
}
