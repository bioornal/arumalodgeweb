import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveIcsUrl, getAvailabilityServer } from "@/lib/reservation/availability.server";
import { GET } from "@/app/api/availability/[unitId]/route";

const RANGE = { from: new Date(2026, 5, 1), to: new Date(2026, 11, 1) };

const SAMPLE_ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260610",
  "DTEND;VALUE=DATE:20260612",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("resolveIcsUrl", () => {
  beforeEach(() => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    delete process.env.ARUMA_ICS_MBERU;
  });
  afterEach(() => {
    delete process.env.ARUMA_ICS_YVYRA;
  });

  it("devuelve la URL de la env var de la unidad", () => {
    expect(resolveIcsUrl("yvyra")).toBe("https://cal/yvyra.ics");
  });

  it("devuelve undefined si falta la env var", () => {
    expect(resolveIcsUrl("mberu")).toBeUndefined();
  });
});

describe("getAvailabilityServer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.ARUMA_ICS_YVYRA;
  });

  it("fail-open con source stub si falta la env var", async () => {
    delete process.env.ARUMA_ICS_YVYRA;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await getAvailabilityServer("yvyra", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });

  it("parsea el ICS y devuelve source google-calendar", async () => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(SAMPLE_ICS, { status: 200 })),
    );
    const res = await getAvailabilityServer("yvyra", RANGE);
    expect(res.source).toBe("google-calendar");
    expect(res.disabledDates).toHaveLength(2); // 10 y 11 (12 es turnover)
  });

  it("fail-open si el fetch no es ok", async () => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const res = await getAvailabilityServer("yvyra", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });

  it("fail-open si el fetch lanza", async () => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network");
    }));
    const res = await getAvailabilityServer("yvyra", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });
});

describe("GET /api/availability/[unitId]", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ARUMA_ICS_YVYRA;
  });

  function ctx(unitId: string) {
    return { params: Promise.resolve({ unitId }) };
  }

  it("serializa las noches ocupadas como YYYY-MM-DD", async () => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(SAMPLE_ICS, { status: 200 })));
    const req = new Request("http://t/api/availability/yvyra?from=2026-06-01&to=2026-12-01");
    const res = await GET(req, ctx("yvyra"));
    const body = await res.json();
    expect(body.source).toBe("google-calendar");
    expect(body.disabledDates).toEqual(["2026-06-10", "2026-06-11"]);
  });

  it("devuelve 400 + stub para una unidad inválida", async () => {
    const req = new Request("http://t/api/availability/nope");
    const res = await GET(req, ctx("nope"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ disabledDates: [], source: "stub" });
  });

  it("usa el rango por defecto (today → +6 meses) cuando faltan from/to", async () => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(SAMPLE_ICS, { status: 200 })));
    const req = new Request("http://t/api/availability/yvyra");
    const res = await GET(req, ctx("yvyra"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("google-calendar");
    expect(Array.isArray(body.disabledDates)).toBe(true);
  });

  it("devuelve 400 + stub si from/to son fechas inválidas", async () => {
    process.env.ARUMA_ICS_YVYRA = "https://cal/yvyra.ics";
    const req = new Request("http://t/api/availability/yvyra?from=garbage&to=2026-12-01");
    const res = await GET(req, ctx("yvyra"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ disabledDates: [], source: "stub" });
  });
});
