import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { createPendingEvent, confirmEvent, deleteEvent } from "@/lib/reservation/calendar.server";

// Clave RSA de juguete: vi.spyOn(crypto, "sign") no funciona en ESM
// ("Cannot redefine property"), así que usamos una key real (mismo patrón
// que tests/reservation/calendar.server.test.ts).
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const TEST_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const ENV = {
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "svc@test.iam", private_key: TEST_PRIVATE_KEY, token_uri: "https://oauth2/token",
  }),
  ARUMA_CAL_TATU: "cal-tatu@group.calendar.google.com",
};

beforeEach(async () => {
  Object.assign(process.env, ENV);
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("oauth2") || u.includes("token")) {
      return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: "evt-new" }), { status: 200 });
  });
});

afterEach(() => {
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.ARUMA_CAL_TATU;
});

const INPUT = {
  unitName: "Cabaña Tatú", firstName: "Juan", lastName: "Pérez", email: "j@t.com",
  phone: "+54", guests: 4, checkIn: "2026-07-02", checkOut: "2026-07-05",
  nights: 3, total: 480000, code: "ARM-2026-AB12", paymentId: "transfer",
};

describe("calendar pending/confirm/delete", () => {
  it("createPendingEvent inserta con título [PENDIENTE] y devuelve eventId", async () => {
    const res = await createPendingEvent("tatu", INPUT);
    expect(res.eventId).toBe("evt-new");
    const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    const body = JSON.parse((lastCall[1] as RequestInit).body as string);
    expect(body.summary).toContain("[PENDIENTE]");
    expect(body.extendedProperties.private.status).toBe("pending_transfer");
  });

  it("confirmEvent hace PATCH del evento", async () => {
    await confirmEvent("tatu", "evt-1");
    const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    expect((lastCall[1] as RequestInit).method).toBe("PATCH");
    expect(String(lastCall[0])).toContain("/events/evt-1");
  });

  it("deleteEvent hace DELETE del evento", async () => {
    await deleteEvent("tatu", "evt-1");
    const lastCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    expect((lastCall[1] as RequestInit).method).toBe("DELETE");
    expect(String(lastCall[0])).toContain("/events/evt-1");
  });
});
