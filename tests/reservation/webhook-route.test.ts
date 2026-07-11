import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

const isRangeAvailable = vi.fn();
const createBookingEvent = vi.fn();
const findBookingEventByCode = vi.fn();
vi.mock("@/lib/reservation/calendar.server", () => ({
  isRangeAvailable: (...a: unknown[]) => isRangeAvailable(...a),
  createBookingEvent: (...a: unknown[]) => createBookingEvent(...a),
  findBookingEventByCode: (...a: unknown[]) => findBookingEventByCode(...a),
}));

const getPayment = vi.fn();
vi.mock("@/lib/reservation/payments.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/payments.server")>(
    "@/lib/reservation/payments.server",
  );
  return { ...actual, getPayment: (...a: unknown[]) => getPayment(...a) };
});

const upsertConfirmedByCode = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  upsertConfirmedByCode: (...a: unknown[]) => upsertConfirmedByCode(...a),
}));

const sendConfirmationEmailOnce = vi.fn();
vi.mock("@/lib/reservation/email.server", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
}));

import { POST } from "@/app/api/webhooks/mercadopago/route";

const SECRET = "test-secret";
const APPROVED_PAYMENT = {
  id: "pay-1",
  status: "approved",
  externalReference: "ARM-2026-AB12",
  metadata: {
    unit_id: "tatu", unit_name: "Cabaña Tatú", first_name: "Juan", last_name: "Pérez",
    email: "juan@test.com", phone: "+54", guests: 4,
    check_in: "2026-07-02", check_out: "2026-07-05", nights: 3, total: 815,
  },
};

function req(dataId: string, requestId: string, valid: boolean) {
  const ts = "1700000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = valid
    ? crypto.createHmac("sha256", SECRET).update(manifest).digest("hex")
    : "deadbeef";
  return new Request("http://t/api/webhooks/mercadopago", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": `ts=${ts},v1=${v1}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
  });
}

beforeEach(() => {
  isRangeAvailable.mockReset();
  createBookingEvent.mockReset();
  findBookingEventByCode.mockReset();
  getPayment.mockReset();
  upsertConfirmedByCode.mockReset();
  upsertConfirmedByCode.mockResolvedValue(undefined);
  sendConfirmationEmailOnce.mockReset();
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
});
afterEach(() => { delete process.env.MERCADOPAGO_WEBHOOK_SECRET; });

describe("POST /api/webhooks/mercadopago", () => {
  it("401 si la firma es inválida", async () => {
    const res = await POST(req("pay-1", "req-1", false));
    expect(res.status).toBe(401);
    expect(getPayment).not.toHaveBeenCalled();
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  });

  it("approved nuevo → crea el evento y responde 200", async () => {
    getPayment.mockResolvedValue(APPROVED_PAYMENT);
    findBookingEventByCode.mockResolvedValue(null);
    isRangeAvailable.mockResolvedValue(true);
    createBookingEvent.mockResolvedValue({ eventId: "evt-1" });
    const res = await POST(req("pay-1", "req-1", true));
    expect(res.status).toBe(200);
    expect(createBookingEvent).toHaveBeenCalledOnce();
    expect(createBookingEvent.mock.calls[0][0]).toBe("tatu");
    expect(createBookingEvent.mock.calls[0][1]).toMatchObject({ code: "ARM-2026-AB12", paymentId: "pay-1" });
  });

  it("approved nuevo → upsert confirmado en Supabase con el eventId creado", async () => {
    getPayment.mockResolvedValue(APPROVED_PAYMENT);
    findBookingEventByCode.mockResolvedValue(null);
    isRangeAvailable.mockResolvedValue(true);
    createBookingEvent.mockResolvedValue({ eventId: "evt-1" });
    const res = await POST(req("pay-1", "req-1", true));
    expect(res.status).toBe(200);
    expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
    const row = upsertConfirmedByCode.mock.calls[0][0];
    expect(row.code).toBe("ARM-2026-AB12");
    expect(row.calendarEventId).toBe("evt-1");
    expect(row.paymentId).toBe("pay-1");
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith("ARM-2026-AB12");
  });

  it("idempotente: si el evento ya existe, no lo duplica", async () => {
    getPayment.mockResolvedValue(APPROVED_PAYMENT);
    findBookingEventByCode.mockResolvedValue({ eventId: "evt-existing" });
    const res = await POST(req("pay-1", "req-1", true));
    expect(res.status).toBe(200);
    expect(createBookingEvent).not.toHaveBeenCalled();
  });

  it("idempotente: igual hace upsert en Supabase reflejando el eventId existente", async () => {
    getPayment.mockResolvedValue(APPROVED_PAYMENT);
    findBookingEventByCode.mockResolvedValue({ eventId: "evt-existing" });
    const res = await POST(req("pay-1", "req-1", true));
    expect(res.status).toBe(200);
    expect(createBookingEvent).not.toHaveBeenCalled();
    expect(upsertConfirmedByCode).toHaveBeenCalledOnce();
    expect(upsertConfirmedByCode.mock.calls[0][0].calendarEventId).toBe("evt-existing");
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith("ARM-2026-AB12");
  });

  it("pago no aprobado → 200 sin crear evento", async () => {
    getPayment.mockResolvedValue({ ...APPROVED_PAYMENT, status: "rejected" });
    const res = await POST(req("pay-1", "req-1", true));
    expect(res.status).toBe(200);
    expect(createBookingEvent).not.toHaveBeenCalled();
    expect(upsertConfirmedByCode).not.toHaveBeenCalled();
  });
});
