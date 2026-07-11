import { describe, it, expect, vi, beforeEach } from "vitest";

// Cadena fluida mínima de supabase-js que usamos.
const insert = vi.fn();
const update = vi.fn();
const eq = vi.fn();
const order = vi.fn();
const select = vi.fn();
const upsert = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({ from }),
}));

import {
  insertReservation,
  upsertConfirmedByCode,
  listReservations,
  setReservationStatus,
  markConfirmationEmailSent,
} from "@/lib/reservation/reservations.server";

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ insert, update, select, upsert });
  insert.mockResolvedValue({ error: null });
  upsert.mockResolvedValue({ error: null });
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
  select.mockReturnValue({ order });
  order.mockResolvedValue({ data: [], error: null });
});

describe("reservations.server", () => {
  it("insertReservation inserta la fila y lanza si hay error", async () => {
    await insertReservation({
      code: "ARM-2026-AB12", unitId: "tatu", unitName: "Cabaña Tatú",
      checkIn: "2026-07-02", checkOut: "2026-07-05", nights: 3, guests: 4,
      firstName: "Juan", lastName: "Pérez", email: "j@t.com", phone: "+54",
      total: 480000, paymentMethod: "transfer", status: "pending",
      comprobantePath: "comprobantes/x.jpg", calendarEventId: "evt-1",
    });
    expect(from).toHaveBeenCalledWith("reservations");
    expect(insert).toHaveBeenCalledOnce();
    const row = insert.mock.calls[0][0];
    expect(row.code).toBe("ARM-2026-AB12");
    expect(row.payment_method).toBe("transfer");
    expect(row.comprobante_path).toBe("comprobantes/x.jpg");

    insert.mockResolvedValueOnce({ error: { message: "boom" } });
    await expect(insertReservation({
      code: "ARM-2026-AB13", unitId: "tatu", unitName: "Cabaña Tatú",
      checkIn: "2026-07-02", checkOut: "2026-07-05", nights: 3, guests: 4,
      firstName: "A", lastName: "B", email: "a@b.com", phone: "",
      total: 1, paymentMethod: "card", status: "confirmed",
    })).rejects.toThrow();
  });

  it("upsertConfirmedByCode es idempotente por code (onConflict)", async () => {
    await upsertConfirmedByCode({
      code: "ARM-2026-AB12", unitId: "tatu", unitName: "Cabaña Tatú",
      checkIn: "2026-07-02", checkOut: "2026-07-05", nights: 3, guests: 4,
      firstName: "Juan", lastName: "Pérez", email: "j@t.com", phone: "+54",
      total: 480000, paymentId: "pay-1", calendarEventId: "evt-1",
    });
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "code" });
    expect(upsert.mock.calls[0][0].status).toBe("confirmed");
  });

  it("listReservations filtra por status salvo 'all'", async () => {
    const eqReturning = vi.fn().mockReturnValue({ order });
    select.mockReturnValue({ eq: eqReturning, order });
    await listReservations("pending");
    expect(eqReturning).toHaveBeenCalledWith("status", "pending");
    await listReservations("all");
    expect(order).toHaveBeenCalled();
  });

  it("setReservationStatus actualiza status y confirmed_at en 'confirmed'", async () => {
    await setReservationStatus("id-1", "confirmed");
    expect(update).toHaveBeenCalledOnce();
    const patch = update.mock.calls[0][0];
    expect(patch.status).toBe("confirmed");
    expect(patch.confirmed_at).toBeTypeOf("string");
    expect(eq).toHaveBeenCalledWith("id", "id-1");
  });

  it("insertReservation incluye locale (default es si no se pasa)", async () => {
    await insertReservation({
      code: "ARM-2026-LC01", unitId: "tatu", unitName: "Casa Tatú",
      checkIn: "2026-07-02", checkOut: "2026-07-05", nights: 3, guests: 4,
      firstName: "Ana", lastName: "Gómez", email: "a@g.com", phone: "",
      total: 1, paymentMethod: "transfer", status: "pending", locale: "pt",
    });
    expect(insert.mock.calls[0][0].locale).toBe("pt");

    await insertReservation({
      code: "ARM-2026-LC02", unitId: "tatu", unitName: "Casa Tatú",
      checkIn: "2026-07-02", checkOut: "2026-07-05", nights: 3, guests: 4,
      firstName: "Ana", lastName: "Gómez", email: "a@g.com", phone: "",
      total: 1, paymentMethod: "transfer", status: "pending",
    });
    expect(insert.mock.calls[1][0].locale).toBe("es");
  });

  it("markConfirmationEmailSent devuelve la fila solo si ganó el flip (data no vacía)", async () => {
    const selectFn = vi.fn().mockResolvedValue({ data: [{ code: "ARM-2026-X1", locale: "en" }], error: null });
    const isFn = vi.fn().mockReturnValue({ select: selectFn });
    const eqFn = vi.fn().mockReturnValue({ is: isFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    from.mockReturnValue({ update: updateFn });

    const row = await markConfirmationEmailSent("ARM-2026-X1");
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ confirmation_email_sent_at: expect.any(String) }),
    );
    expect(eqFn).toHaveBeenCalledWith("code", "ARM-2026-X1");
    expect(isFn).toHaveBeenCalledWith("confirmation_email_sent_at", null);
    expect(row).toEqual({ code: "ARM-2026-X1", locale: "en" });
  });

  it("markConfirmationEmailSent devuelve null si el flip no afectó filas (ya enviado)", async () => {
    const selectFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const isFn = vi.fn().mockReturnValue({ select: selectFn });
    const eqFn = vi.fn().mockReturnValue({ is: isFn });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    from.mockReturnValue({ update: updateFn });

    const row = await markConfirmationEmailSent("ARM-2026-X1");
    expect(row).toBeNull();
  });
});
