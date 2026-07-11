import type { UnitId } from "./reducer";

export type DateRange = { from: Date; to: Date };
export type AvailabilitySource = "stub" | "google-calendar" | "channel-manager";
export type Availability = { disabledDates: Date[]; source: AvailabilitySource };

/** Convierte "YYYY-MM-DD" a un Date a medianoche LOCAL (sin corrimiento de TZ). */
function fromDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Disponibilidad real: consulta el route handler server-side, que lee el iCal
 * de Google de la unidad. Fail-open: ante cualquier error devuelve el stub
 * (sin fechas deshabilitadas) para no romper la UI de reserva.
 */
export async function getAvailability(unitId: UnitId, range: DateRange): Promise<Availability> {
  const params = new URLSearchParams({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });
  try {
    const res = await fetch(`/api/availability/${unitId}?${params.toString()}`);
    if (!res.ok) return { disabledDates: [], source: "stub" };
    const data = (await res.json()) as { disabledDates: string[]; source: AvailabilitySource };
    if (!Array.isArray(data.disabledDates)) return { disabledDates: [], source: "stub" };
    return { disabledDates: data.disabledDates.map(fromDateOnly), source: data.source };
  } catch {
    return { disabledDates: [], source: "stub" };
  }
}
