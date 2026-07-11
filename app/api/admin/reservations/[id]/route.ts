import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { getReservationById, setReservationStatus } from "@/lib/reservation/reservations.server";
import { confirmEvent, deleteEvent } from "@/lib/reservation/calendar.server";
import { sendConfirmationEmailOnce } from "@/lib/reservation/email.server";
import type { UnitId } from "@/lib/reservation/reducer";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Defensa en profundidad (el middleware ya bloquea, pero re-verificamos).
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let action: string;
  try {
    action = String(((await req.json()) as { action?: string }).action ?? "");
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  if (action !== "confirm" && action !== "release") {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const r = await getReservationById(id);
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (r.payment_method !== "transfer" || r.status !== "pending" || !r.calendar_event_id) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  try {
    if (action === "confirm") {
      await confirmEvent(r.unit_id as UnitId, r.calendar_event_id);
      await setReservationStatus(id, "confirmed");
      try { await sendConfirmationEmailOnce(r.code); }
      catch (err) { console.error("[admin] email fallo:", err instanceof Error ? err.message : err); }
    } else {
      await deleteEvent(r.unit_id as UnitId, r.calendar_event_id);
      await setReservationStatus(id, "released");
    }
  } catch (err) {
    console.error("[admin] acción fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "server" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
