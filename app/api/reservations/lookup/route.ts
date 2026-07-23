import { NextResponse } from "next/server";
import { findReservationForGuest } from "@/lib/reservation/lookup.server";
import { isValidEmail } from "@/lib/reservation/validation";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (rateLimited("lookup", clientIp(req), 20, 60_000)) {
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
