import { describe, it, expect, vi, beforeEach } from "vitest";

// Cadena fluida mínima de supabase-js: from().select().eq().single()
const single = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({ from }),
}));

import { findReservationForGuest } from "@/lib/reservation/lookup.server";

const ROW = {
  code: "ARM-2026-AB12",
  unit_name: "Cabaña Tatú",
  check_in: "2026-07-02",
  check_out: "2026-07-05",
  nights: 3,
  guests: 4,
  total: 480000,
  payment_method: "transfer",
  status: "pending",
  email: "Huesped@Test.com",
  // campos sensibles que NO deben salir:
  id: "uuid-1",
  calendar_event_id: "evt-1",
  payment_id: "pay-1",
  comprobante_path: "comprobantes/x.jpg",
  phone: "+54",
};

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ single });
  single.mockResolvedValue({ data: ROW, error: null });
});

describe("findReservationForGuest", () => {
  it("devuelve la vista saneada cuando code+email coinciden", async () => {
    const v = await findReservationForGuest("ARM-2026-AB12", "huesped@test.com");
    expect(v).toEqual({
      code: "ARM-2026-AB12",
      unitName: "Cabaña Tatú",
      checkIn: "2026-07-02",
      checkOut: "2026-07-05",
      nights: 3,
      guests: 4,
      total: 480000,
      paymentMethod: "transfer",
      status: "pending",
    });
  });

  it("normaliza código (mayúsculas) y email (minúsculas + espacios)", async () => {
    const v = await findReservationForGuest("  arm-2026-ab12 ", "  HUESPED@test.com ");
    expect(v).not.toBeNull();
    expect(eq).toHaveBeenCalledWith("code", "ARM-2026-AB12");
  });

  it("no expone campos sensibles", async () => {
    const v = await findReservationForGuest("ARM-2026-AB12", "huesped@test.com");
    expect(v).not.toBeNull();
    expect(v).not.toHaveProperty("id");
    expect(v).not.toHaveProperty("email");
    expect(v).not.toHaveProperty("phone");
    expect(v).not.toHaveProperty("calendar_event_id");
    expect(v).not.toHaveProperty("payment_id");
    expect(v).not.toHaveProperty("comprobante_path");
  });

  it("devuelve null si el email no coincide", async () => {
    const v = await findReservationForGuest("ARM-2026-AB12", "otro@test.com");
    expect(v).toBeNull();
  });

  it("devuelve null si el código tiene formato inválido (no consulta)", async () => {
    const v = await findReservationForGuest("NO-CODE", "huesped@test.com");
    expect(v).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("devuelve null si la fila no existe (error de single)", async () => {
    single.mockResolvedValue({ data: null, error: { message: "no rows" } });
    const v = await findReservationForGuest("ARM-2026-AB12", "huesped@test.com");
    expect(v).toBeNull();
  });
});
