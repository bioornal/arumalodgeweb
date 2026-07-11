import { describe, it, expect, vi, beforeEach } from "vitest";

const findReservationForGuest = vi.fn();
vi.mock("@/lib/reservation/lookup.server", () => ({
  findReservationForGuest: (...a: unknown[]) => findReservationForGuest(...a),
}));

import { POST } from "@/app/api/reservations/lookup/route";

// IP única por request para no chocar con el rate-limit best-effort.
function req(body: unknown, ip = String(Math.random())) {
  return new Request("http://t/api/reservations/lookup", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VIEW = {
  code: "ARM-2026-AB12", unitName: "Cabaña Tatú",
  checkIn: "2026-07-02", checkOut: "2026-07-05",
  nights: 3, guests: 4, total: 480000,
  paymentMethod: "transfer", status: "pending",
};

beforeEach(() => {
  vi.clearAllMocks();
  findReservationForGuest.mockResolvedValue(VIEW);
});

describe("POST /api/reservations/lookup", () => {
  it("200 con la vista saneada en el caso feliz", async () => {
    const res = await POST(req({ code: "ARM-2026-AB12", email: "huesped@test.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).reservation).toEqual(VIEW);
  });

  it("400 si falta el código", async () => {
    const res = await POST(req({ email: "huesped@test.com" }));
    expect(res.status).toBe(400);
    expect(findReservationForGuest).not.toHaveBeenCalled();
  });

  it("400 si el email tiene formato inválido", async () => {
    const res = await POST(req({ code: "ARM-2026-AB12", email: "no-es-email" }));
    expect(res.status).toBe(400);
  });

  it("400 si el body no es JSON", async () => {
    const res = await POST(req("{no-json"));
    expect(res.status).toBe(400);
  });

  it("404 genérico si no existe", async () => {
    findReservationForGuest.mockResolvedValue(null);
    const res = await POST(req({ code: "ARM-2026-ZZ99", email: "huesped@test.com" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("404 idéntico cuando el email no coincide (anti-enumeración)", async () => {
    findReservationForGuest.mockResolvedValue(null);
    const res = await POST(req({ code: "ARM-2026-AB12", email: "otro@test.com" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("503 si la capa server lanza (Supabase no disponible)", async () => {
    findReservationForGuest.mockRejectedValue(new Error("supabase down"));
    const res = await POST(req({ code: "ARM-2026-AB12", email: "huesped@test.com" }));
    expect(res.status).toBe(503);
  });

  it("429 al superar el rate-limit por IP", async () => {
    let last: Response | undefined;
    for (let i = 0; i < 25; i++) {
      last = await POST(req({ code: "ARM-2026-AB12", email: "huesped@test.com" }, "9.9.9.9"));
    }
    expect(last!.status).toBe(429);
  });
});
