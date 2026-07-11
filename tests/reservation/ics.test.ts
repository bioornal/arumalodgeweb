import { describe, it, expect } from "vitest";
import { parseIcsBusyDates } from "@/lib/reservation/ics";

const RANGE = { from: new Date(2026, 5, 1), to: new Date(2026, 11, 1) }; // jun→dic 2026

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ics(...events: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join("\r\n");
}

function vevent(lines: string[]): string {
  return ["BEGIN:VEVENT", ...lines, "END:VEVENT"].join("\r\n");
}

describe("parseIcsBusyDates", () => {
  it("reserva all-day de 1 noche ocupa solo esa noche", () => {
    const text = ics(vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260611"]));
    expect(parseIcsBusyDates(text, RANGE).map(ymd)).toEqual(["2026-06-10"]);
  });

  it("reserva multi-día ocupa todas las noches del rango [start, end)", () => {
    const text = ics(vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260613"]));
    expect(parseIcsBusyDates(text, RANGE).map(ymd)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
    ]);
  });

  it("turnover: DTEND exclusivo NO deshabilita el día de check-out", () => {
    const text = ics(vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260612"]));
    const days = parseIcsBusyDates(text, RANGE).map(ymd);
    expect(days).toEqual(["2026-06-10", "2026-06-11"]);
    expect(days).not.toContain("2026-06-12");
  });

  it("evento con hora se normaliza a los días que toca (end inclusivo)", () => {
    const text = ics(vevent(["DTSTART:20260615T140000Z", "DTEND:20260615T180000Z"]));
    expect(parseIcsBusyDates(text, RANGE).map(ymd)).toEqual(["2026-06-15"]);
  });

  it("ignora eventos STATUS:CANCELLED", () => {
    const text = ics(
      vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260611", "STATUS:CANCELLED"]),
    );
    expect(parseIcsBusyDates(text, RANGE)).toEqual([]);
  });

  it("ignora eventos TRANSP:TRANSPARENT (libres)", () => {
    const text = ics(
      vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260611", "TRANSP:TRANSPARENT"]),
    );
    expect(parseIcsBusyDates(text, RANGE)).toEqual([]);
  });

  it("ignora eventos fuera del rango consultado", () => {
    const text = ics(vevent(["DTSTART;VALUE=DATE:20250101", "DTEND;VALUE=DATE:20250105"]));
    expect(parseIcsBusyDates(text, RANGE)).toEqual([]);
  });

  it("deduplica y ordena noches de eventos solapados", () => {
    const text = ics(
      vevent(["DTSTART;VALUE=DATE:20260612", "DTEND;VALUE=DATE:20260614"]),
      vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260613"]),
    );
    expect(parseIcsBusyDates(text, RANGE).map(ymd)).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
    ]);
  });

  it("maneja line folding (RFC 5545)", () => {
    const folded = ["BEGIN:VEVENT", "DTSTART;VALUE=DATE:2026", " 0610", "DTEND;VALUE=DATE:20260611", "END:VEVENT"].join("\r\n");
    const text = ["BEGIN:VCALENDAR", folded, "END:VCALENDAR"].join("\r\n");
    expect(parseIcsBusyDates(text, RANGE).map(ymd)).toEqual(["2026-06-10"]);
  });

  // Fija la limitación conocida de TZ: para eventos con hora se usa la porción de
  // fecha del valor tal cual, sin convertir la zona. Un Z cerca de medianoche ocupa
  // el día de su porción YYYYMMDD. Documentado en el JSDoc de parseIcsBusyDates.
  it("evento con hora cerca de medianoche ocupa el día de su porción de fecha (limitación TZ)", () => {
    const text = ics(vevent(["DTSTART:20260615T230000Z", "DTEND:20260615T233000Z"]));
    expect(parseIcsBusyDates(text, RANGE).map(ymd)).toEqual(["2026-06-15"]);
  });

  it("STATUS/TRANSP se comparan sin distinguir mayúsculas", () => {
    const text = ics(
      vevent(["DTSTART;VALUE=DATE:20260610", "DTEND;VALUE=DATE:20260611", "STATUS:cancelled"]),
      vevent(["DTSTART;VALUE=DATE:20260620", "DTEND;VALUE=DATE:20260621", "TRANSP:transparent"]),
    );
    expect(parseIcsBusyDates(text, RANGE)).toEqual([]);
  });
});
