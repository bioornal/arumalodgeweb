import { parseIcsBusyDates } from "./ics";
import type { Availability, DateRange } from "./availability";
import type { UnitId } from "./reducer";

// Solo debe importarse desde código server (route handler). No agregar
// "server-only" para mantener el módulo testeable en Vitest.

const ENV_BY_UNIT: Record<UnitId, string> = {
  yvyra: "ARUMA_ICS_YVYRA",
  mberu: "ARUMA_ICS_MBERU",
  tatu: "ARUMA_ICS_TATU",
};

export function resolveIcsUrl(unitId: UnitId): string | undefined {
  return process.env[ENV_BY_UNIT[unitId]];
}

export async function getAvailabilityServer(
  unitId: UnitId,
  range: DateRange,
): Promise<Availability> {
  const url = resolveIcsUrl(unitId);
  if (!url) {
    console.error(`[availability] falta env ${ENV_BY_UNIT[unitId]} para unidad ${unitId}`);
    return { disabledDates: [], source: "stub" };
  }
  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) {
      console.error(`[availability] ICS fetch ${res.status} para ${unitId}`);
      return { disabledDates: [], source: "stub" };
    }
    const ics = await res.text();
    return { disabledDates: parseIcsBusyDates(ics, range), source: "google-calendar" };
  } catch (err) {
    // No logueamos `url` ni el objeto crudo: la URL .ics es una credencial secreta.
    console.error(
      `[availability] error ICS para ${unitId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { disabledDates: [], source: "stub" };
  }
}
