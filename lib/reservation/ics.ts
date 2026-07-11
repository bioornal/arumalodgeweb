import type { DateRange } from "./availability";

/** Une líneas plegadas (RFC 5545: CRLF seguido de espacio o tab continúa la línea anterior). */
function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, "");
}

type Prop = { params: string; value: string };

// `name` debe ser un nombre de propiedad literal (sin metacaracteres regex).
// El lookahead `(?=[;:])` evita que un nombre haga match como prefijo de otro
// (p. ej. STATUS vs un hipotético STATUSTYPE).
function getProp(block: string, name: string): Prop | null {
  const re = new RegExp(`^${name}(?=[;:])([^:\\r\\n]*):(.*)$`, "m");
  const m = re.exec(block);
  if (!m) return null;
  return { params: m[1], value: m[2].trim() };
}

/** Construye un Date a medianoche LOCAL del día calendario YYYYMMDD del valor ICS. */
function parseIcsDate(value: string): Date {
  const y = Number(value.slice(0, 4));
  const mo = Number(value.slice(4, 6)) - 1;
  const d = Number(value.slice(6, 8));
  return new Date(y, mo, d);
}

function isDateOnly(prop: Prop): boolean {
  return /VALUE=DATE\b/.test(prop.params) || !prop.value.includes("T");
}

function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Devuelve las noches ocupadas (Date a medianoche local) dentro de `range`,
 * a partir del texto de un calendario iCal de Google.
 *
 * Reglas:
 * - all-day: `[DTSTART, DTEND)` con DTEND exclusivo (semántica de turnover).
 * - con hora: ocupa los días calendario que toca, end inclusivo.
 * - sin DTEND: ocupa solo el día de DTSTART.
 * - ignora STATUS:CANCELLED y TRANSP:TRANSPARENT.
 *
 * Limitación conocida (fuera de alcance): para eventos con hora se usa la porción
 * de fecha YYYYMMDD del valor tal cual, sin convertir la zona horaria (`Z`/`TZID`).
 * Un timestamp UTC cerca de medianoche puede caer en un día distinto al día local
 * percibido. Para un bloqueador de disponibilidad es aceptable (sobre-bloquear un
 * día es el modo de fallo seguro). Las reservas reales son eventos all-day, donde
 * esto no aplica.
 */
export function parseIcsBusyDates(icsText: string, range: DateRange): Date[] {
  const text = unfold(icsText);
  const vevent = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  const lo = midnight(range.from).getTime();
  const hi = midnight(range.to).getTime();
  const seen = new Set<number>();

  let m: RegExpExecArray | null;
  while ((m = vevent.exec(text)) !== null) {
    const block = m[1];

    const status = getProp(block, "STATUS");
    if (status && status.value.toUpperCase() === "CANCELLED") continue;
    const transp = getProp(block, "TRANSP");
    if (transp && transp.value.toUpperCase() === "TRANSPARENT") continue;

    const dtStart = getProp(block, "DTSTART");
    if (!dtStart) continue;
    const start = parseIcsDate(dtStart.value);

    const dtEnd = getProp(block, "DTEND");
    let end: Date;
    if (!dtEnd) {
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    } else {
      end = parseIcsDate(dtEnd.value);
      if (!isDateOnly(dtEnd)) {
        // con hora: hacer el end inclusivo del día que toca
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      }
    }

    for (
      let d = midnight(start);
      d.getTime() < end.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const t = d.getTime();
      if (t < lo || t > hi) continue;
      seen.add(t);
    }
  }

  return [...seen].sort((a, b) => a - b).map((t) => new Date(t));
}
