import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const isRangeAvailable = vi.fn();
const createBookingEvent = vi.fn();
vi.mock("@/lib/reservation/calendar.server", () => ({
  isRangeAvailable: (...a: unknown[]) => isRangeAvailable(...a),
  createBookingEvent: (...a: unknown[]) => createBookingEvent(...a),
}));

const createCardPayment = vi.fn();
vi.mock("@/lib/reservation/payments.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/payments.server")>(
    "@/lib/reservation/payments.server",
  );
  return {
    ...actual,
    createCardPayment: (...a: unknown[]) => createCardPayment(...a),
  };
});

const insertReservation = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  upsertConfirmedByCode: vi.fn(),
}));

const sendConfirmationEmailOnce = vi.fn();
vi.mock("@/lib/reservation/email.server", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
}));

// Tarifas: siempre los defaults — el test no depende de la DB ni del admin.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

import { POST } from "@/app/api/payments/route";

const CARD = { token: "tok-1", paymentMethodId: "visa", installments: 1 };
const VALID = {
  unitId: "tatu",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  guests: 4,
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@test.com",
  phone: "+54",
  payment: CARD,
};

function post(body: unknown) {
  return new Request("http://t/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  isRangeAvailable.mockReset();
  createBookingEvent.mockReset();
  createCardPayment.mockReset();
  insertReservation.mockReset();
  insertReservation.mockResolvedValue(undefined);
  sendConfirmationEmailOnce.mockReset();
  delete process.env.PAYMENTS_MOCK;
});
afterEach(() => { delete process.env.PAYMENTS_MOCK; });

describe("POST /api/payments", () => {
  it("approved → crea evento y responde 200 con código", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    createBookingEvent.mockResolvedValue({ eventId: "evt-1" });
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(body.code).toMatch(/^ARM-\d{4}-[A-Z2-9]{4}$/);
    expect(createBookingEvent).toHaveBeenCalledOnce();
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith(expect.stringMatching(/^ARM-/));
  });

  it("cobra el total recalculado server-side, ignorando lo que mande el cliente", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    createBookingEvent.mockResolvedValue({ eventId: "evt-1" });
    await POST(post({ ...VALID, amount: 1, total: 1 }));
    // tatu 4 huéspedes → $130.000 × 3 noches + $30.000 limpieza = $420.000
    expect(createCardPayment.mock.calls[0][0].amount).toBe(420000);
  });

  it("rejected → NO crea evento, responde 200 rejected", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-2", status: "rejected", statusDetail: "cc_rejected" });
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("rejected");
    expect(createBookingEvent).not.toHaveBeenCalled();
  });

  it("pending → NO crea evento, responde 200 pending", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-3", status: "in_process" });
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
    expect(createBookingEvent).not.toHaveBeenCalled();
  });

  it("400 si el payload de reserva es inválido", async () => {
    const res = await POST(post({ ...VALID, email: "no-es-email" }));
    expect(res.status).toBe(400);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("400 si falta el método de pago", async () => {
    const { payment: _omit, ...noPay } = VALID;
    const res = await POST(post(noPay));
    expect(res.status).toBe(400);
  });

  it("409 si las fechas ya no están disponibles", async () => {
    isRangeAvailable.mockResolvedValue(false);
    const res = await POST(post(VALID));
    expect(res.status).toBe(409);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("502 fail-closed si el re-chequeo lanza", async () => {
    isRangeAvailable.mockRejectedValue(new Error("calendar down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
  });

  it("502 si MP lanza", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockRejectedValue(new Error("mp down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
  });

  it("502 si el insert del evento lanza tras approved", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    createBookingEvent.mockRejectedValue(new Error("insert fail"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(502);
  });

  it("modo mock: mockOutcome approved crea evento sin llamar a MP", async () => {
    process.env.PAYMENTS_MOCK = "1";
    isRangeAvailable.mockResolvedValue(true);
    createBookingEvent.mockResolvedValue({ eventId: "evt-mock" });
    const res = await POST(post({ ...VALID, payment: { mockOutcome: "approved" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
    expect(createCardPayment).not.toHaveBeenCalled();
    expect(createBookingEvent).toHaveBeenCalledOnce();
  });

  it("mockOutcome se ignora si PAYMENTS_MOCK está apagado (400 sin token)", async () => {
    const res = await POST(post({ ...VALID, payment: { mockOutcome: "approved" } }));
    expect(res.status).toBe(400);
  });

  it("approved → inserta reserva card/confirmed en Supabase", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    createBookingEvent.mockResolvedValue({ eventId: "evt-1" });
    await POST(post(VALID));
    expect(insertReservation).toHaveBeenCalledOnce();
    const row = insertReservation.mock.calls[0][0];
    expect(row.paymentMethod).toBe("card");
    expect(row.status).toBe("confirmed");
    expect(row.paymentId).toBe("pay-1");
    expect(row.calendarEventId).toBe("evt-1");
  });

  it("approved sigue 200 aunque el insert Supabase falle (best-effort)", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-1", status: "approved" });
    createBookingEvent.mockResolvedValue({ eventId: "evt-1" });
    insertReservation.mockRejectedValue(new Error("db down"));
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
  });

  it("pending → inserta reserva card/pending sin evento", async () => {
    isRangeAvailable.mockResolvedValue(true);
    createCardPayment.mockResolvedValue({ id: "pay-3", status: "in_process" });
    await POST(post(VALID));
    expect(insertReservation).toHaveBeenCalledOnce();
    expect(insertReservation.mock.calls[0][0].status).toBe("pending");
    expect(createBookingEvent).not.toHaveBeenCalled();
  });
});
