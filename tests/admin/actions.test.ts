import { describe, it, expect, vi, beforeEach } from "vitest";

const getReservationById = vi.fn();
const setReservationStatus = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  getReservationById: (...a: unknown[]) => getReservationById(...a),
  setReservationStatus: (...a: unknown[]) => setReservationStatus(...a),
}));

const confirmEvent = vi.fn();
const deleteEvent = vi.fn();
vi.mock("@/lib/reservation/calendar.server", () => ({
  confirmEvent: (...a: unknown[]) => confirmEvent(...a),
  deleteEvent: (...a: unknown[]) => deleteEvent(...a),
}));

const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

const sendConfirmationEmailOnce = vi.fn();
vi.mock("@/lib/reservation/email.server", () => ({
  sendConfirmationEmailOnce: (...a: unknown[]) => sendConfirmationEmailOnce(...a),
}));

import { POST } from "@/app/api/admin/reservations/[id]/route";

function post(action: string) {
  return new Request("http://t/api/admin/reservations/abc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
const ctx = { params: Promise.resolve({ id: "abc" }) };

beforeEach(() => {
  vi.clearAllMocks();
  getAdminUser.mockResolvedValue({ email: "admin@aruma.com" });
  getReservationById.mockResolvedValue({
    id: "abc", unit_id: "tatu", calendar_event_id: "evt-1",
    payment_method: "transfer", status: "pending", code: "ARM-2026-AB12",
  });
});

describe("POST /api/admin/reservations/[id]", () => {
  it("confirm → confirmEvent + status confirmed", async () => {
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(200);
    expect(confirmEvent).toHaveBeenCalledWith("tatu", "evt-1");
    expect(setReservationStatus).toHaveBeenCalledWith("abc", "confirmed");
    expect(sendConfirmationEmailOnce).toHaveBeenCalledWith("ARM-2026-AB12");
  });

  it("release → deleteEvent + status released", async () => {
    const res = await POST(post("release"), ctx);
    expect(res.status).toBe(200);
    expect(deleteEvent).toHaveBeenCalledWith("tatu", "evt-1");
    expect(setReservationStatus).toHaveBeenCalledWith("abc", "released");
  });

  it("401 si no hay admin", async () => {
    getAdminUser.mockResolvedValue(null);
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(401);
  });

  it("400 si la reserva no es transfer/pending", async () => {
    getReservationById.mockResolvedValue({ id: "abc", payment_method: "card", status: "confirmed" });
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(400);
    expect(confirmEvent).not.toHaveBeenCalled();
  });

  it("404 si la reserva no existe", async () => {
    getReservationById.mockResolvedValue(null);
    const res = await POST(post("confirm"), ctx);
    expect(res.status).toBe(404);
  });
});
