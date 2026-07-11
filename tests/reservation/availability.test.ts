import { describe, it, expect, afterEach, vi } from "vitest";
import { getAvailability } from "@/lib/reservation/availability";

const RANGE = { from: new Date(2026, 5, 1), to: new Date(2026, 11, 1) };

describe("getAvailability (cliente)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapea las fechas YYYY-MM-DD a Date local (sin corrimiento de TZ)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ disabledDates: ["2026-06-10", "2026-06-11"], source: "google-calendar" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const res = await getAvailability("yvyra", RANGE);
    expect(res.source).toBe("google-calendar");
    expect(res.disabledDates).toHaveLength(2);
    const d0 = res.disabledDates[0];
    expect([d0.getFullYear(), d0.getMonth(), d0.getDate()]).toEqual([2026, 5, 10]);
  });

  it("fail-open (stub, sin fechas) si la respuesta no es ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const res = await getAvailability("yvyra", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });

  it("fail-open si el fetch lanza", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network");
    }));
    const res = await getAvailability("yvyra", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "stub" });
  });

  it("consulta el endpoint correcto con la unidad y el rango", async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      new Response(JSON.stringify({ disabledDates: [], source: "google-calendar" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await getAvailability("mberu", RANGE);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("/api/availability/mberu");
    expect(calledUrl).toContain("from=");
    expect(calledUrl).toContain("to=");
  });

  it("pasa el source aunque no haya fechas (no lo confunde con el stub)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ disabledDates: [], source: "google-calendar" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const res = await getAvailability("yvyra", RANGE);
    expect(res).toEqual({ disabledDates: [], source: "google-calendar" });
  });
});
