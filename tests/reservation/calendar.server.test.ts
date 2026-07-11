import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import { isRangeAvailable, createBookingEvent, findBookingEventByCode } from "@/lib/reservation/calendar.server";

// Clave RSA de juguete para que crypto.sign funcione en el test.
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const TEST_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const FAKE_SA = JSON.stringify({
  client_email: "bot@test.iam.gserviceaccount.com",
  private_key: TEST_PRIVATE_KEY,
  token_uri: "https://oauth2.test/token",
});

beforeEach(() => {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = FAKE_SA;
  process.env.ARUMA_CAL_YVYRA = "yvyra@group.calendar.google.com";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.ARUMA_CAL_YVYRA;
});

function stubFetch(handlers: {
  events?: (url: string, init?: RequestInit) => Response;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("oauth2.test/token")) {
        return new Response(JSON.stringify({ access_token: "fake-token" }), { status: 200 });
      }
      return handlers.events!(url, init);
    }),
  );
}

describe("isRangeAvailable", () => {
  it("true cuando no hay eventos que solapen las noches", async () => {
    stubFetch({ events: () => new Response(JSON.stringify({ items: [] }), { status: 200 }) });
    const ok = await isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" });
    expect(ok).toBe(true);
  });

  it("false cuando un evento all-day solapa las noches pedidas", async () => {
    stubFetch({
      events: () =>
        new Response(
          JSON.stringify({ items: [{ start: { date: "2026-07-03" }, end: { date: "2026-07-04" } }] }),
          { status: 200 },
        ),
    });
    const ok = await isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" });
    expect(ok).toBe(false);
  });

  it("true en turnover: evento que termina el día de check-in NO bloquea", async () => {
    stubFetch({
      events: () =>
        new Response(
          JSON.stringify({ items: [{ start: { date: "2026-06-30" }, end: { date: "2026-07-02" } }] }),
          { status: 200 },
        ),
    });
    const ok = await isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" });
    expect(ok).toBe(true);
  });

  it("false cuando un evento contiene completamente el rango", async () => {
    stubFetch({
      events: () =>
        new Response(
          JSON.stringify({ items: [{ start: { date: "2026-07-01" }, end: { date: "2026-07-10" } }] }),
          { status: 200 },
        ),
    });
    const ok = await isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" });
    expect(ok).toBe(false);
  });

  it("consulta events.list con ventana ±1 día y singleEvents=true", async () => {
    let calledUrl = "";
    stubFetch({
      events: (url) => {
        calledUrl = url;
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      },
    });
    await isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" });
    expect(calledUrl).toContain("singleEvents=true");
    // timeMin = from-1 = 2026-07-01, timeMax = to+1 = 2026-07-06 (URL-encoded)
    expect(decodeURIComponent(calledUrl)).toContain("timeMin=2026-07-01T00:00:00Z");
    expect(decodeURIComponent(calledUrl)).toContain("timeMax=2026-07-06T00:00:00Z");
  });

  it("fail-closed si la página de eventos viene llena (posible paginación)", async () => {
    const full = Array.from({ length: 250 }, () => ({
      start: { date: "2030-01-01" },
      end: { date: "2030-01-02" },
    }));
    stubFetch({ events: () => new Response(JSON.stringify({ items: full }), { status: 200 }) });
    const ok = await isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" });
    expect(ok).toBe(false); // ninguno solapa, pero la página llena → NO disponible
  });

  it("lanza si falta GOOGLE_SERVICE_ACCOUNT_JSON", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    stubFetch({ events: () => new Response(JSON.stringify({ items: [] }), { status: 200 }) });
    await expect(isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" })).rejects.toThrow();
  });

  it("lanza si la API responde con error", async () => {
    stubFetch({ events: () => new Response("nope", { status: 500 }) });
    await expect(isRangeAvailable("yvyra", { from: "2026-07-02", to: "2026-07-05" })).rejects.toThrow();
  });
});

describe("createBookingEvent", () => {
  it("inserta el evento pagado [CONFIRMADA] con paymentId y estado paid", async () => {
    type CapturedEvent = {
      summary: string;
      description: string;
      start: { date: string };
      end: { date: string };
      extendedProperties: { private: Record<string, string> };
    };
    let captured: CapturedEvent | null = null;
    stubFetch({
      events: (_url, init) => {
        captured = JSON.parse(String(init!.body)) as CapturedEvent;
        return new Response(JSON.stringify({ id: "evt-123" }), { status: 200 });
      },
    });
    const res = await createBookingEvent("yvyra", {
      unitName: "Suite Yvyrá",
      firstName: "Juan",
      lastName: "Pérez",
      email: "juan@test.com",
      phone: "+54 9 11",
      guests: 2,
      checkIn: "2026-07-02",
      checkOut: "2026-07-05",
      nights: 3,
      total: 395,
      code: "ARM-2026-AB12",
      paymentId: "pay-999",
    });
    expect(res.eventId).toBe("evt-123");
    expect(captured!.summary).toBe("[CONFIRMADA] Suite Yvyrá — Juan Pérez");
    expect(captured!.start.date).toBe("2026-07-02");
    expect(captured!.end.date).toBe("2026-07-05");
    expect(captured!.description).toContain("$395");
    expect(captured!.description).not.toContain("US$");
    expect(captured!.extendedProperties.private.code).toBe("ARM-2026-AB12");
    expect(captured!.extendedProperties.private.status).toBe("paid");
    expect(captured!.extendedProperties.private.paymentId).toBe("pay-999");
  });

  it("lanza si el insert falla", async () => {
    stubFetch({ events: () => new Response("err", { status: 403 }) });
    await expect(
      createBookingEvent("yvyra", {
        unitName: "Suite Yvyrá", firstName: "J", lastName: "P", email: "j@t.com",
        phone: "", guests: 1, checkIn: "2026-07-02", checkOut: "2026-07-05",
        nights: 3, total: 395, code: "ARM-2026-AB12", paymentId: "x",
      }),
    ).rejects.toThrow();
  });
});

describe("findBookingEventByCode", () => {
  it("devuelve el eventId cuando existe un evento con ese código", async () => {
    let calledUrl = "";
    stubFetch({
      events: (url) => {
        calledUrl = url;
        return new Response(JSON.stringify({ items: [{ id: "evt-existing" }] }), { status: 200 });
      },
    });
    const found = await findBookingEventByCode("yvyra", "ARM-2026-AB12");
    expect(found).toEqual({ eventId: "evt-existing" });
    expect(decodeURIComponent(calledUrl)).toContain("privateExtendedProperty=code=ARM-2026-AB12");
  });

  it("devuelve null cuando no hay evento con ese código", async () => {
    stubFetch({ events: () => new Response(JSON.stringify({ items: [] }), { status: 200 }) });
    const found = await findBookingEventByCode("yvyra", "ARM-2026-ZZ99");
    expect(found).toBeNull();
  });
});
