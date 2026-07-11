import { NextResponse } from "next/server";
import { getAvailabilityServer } from "@/lib/reservation/availability.server";
import type { UnitId } from "@/lib/reservation/reducer";

const VALID_UNITS: UnitId[] = ["yvyra", "mberu", "tatu"];

function isUnitId(v: string): v is UnitId {
  return (VALID_UNITS as string[]).includes(v);
}

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const STUB = { disabledDates: [], source: "stub" } as const;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ unitId: string }> },
) {
  const { unitId } = await ctx.params;
  if (!isUnitId(unitId)) {
    return NextResponse.json(STUB, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam
    ? new Date(toParam)
    : new Date(from.getFullYear(), from.getMonth() + 6, 1);

  // Params malformados (Invalid Date) producirían comparaciones NaN ambiguas
  // aguas abajo: degradamos de forma determinista al stub.
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json(STUB, { status: 400 });
  }

  const { disabledDates, source } = await getAvailabilityServer(unitId, { from, to });
  return NextResponse.json({ disabledDates: disabledDates.map(toDateOnly), source });
}
