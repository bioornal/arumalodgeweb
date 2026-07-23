// @vitest-environment node
// Esta ruta sube FormData con un File real; el polyfill de File de jsdom
// (entorno default del proyecto) reporta `size` incorrecto al parsear
// multipart vía Request.formData(). El entorno "node" usa el File nativo
// de undici, donde el tamaño se preserva correctamente.
import { describe, it, expect, vi, beforeEach } from "vitest";

const isRangeAvailable = vi.fn();
const createPendingEvent = vi.fn();
const deleteEvent = vi.fn();
vi.mock("@/lib/reservation/calendar.server", () => ({
  isRangeAvailable: (...a: unknown[]) => isRangeAvailable(...a),
  createPendingEvent: (...a: unknown[]) => createPendingEvent(...a),
  deleteEvent: (...a: unknown[]) => deleteEvent(...a),
}));

const uploadComprobante = vi.fn();
const removeComprobante = vi.fn();
vi.mock("@/lib/reservation/comprobante.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/comprobante.server")>(
    "@/lib/reservation/comprobante.server",
  );
  return {
    ...actual,
    uploadComprobante: (...a: unknown[]) => uploadComprobante(...a),
    removeComprobante: (...a: unknown[]) => removeComprobante(...a),
  };
});

const insertReservation = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  insertReservation: (...a: unknown[]) => insertReservation(...a),
  generateUniqueBookingCode: vi.fn(async () => "ARM-2026-TEST"),
}));

// Tarifas: siempre los defaults — el test no depende de la DB ni del admin.
vi.mock("@/lib/reservation/rate-settings.server", async () => {
  const { DEFAULT_RATE_SETTINGS } = await vi.importActual<
    typeof import("@/lib/reservation/rate-settings")
  >("@/lib/reservation/rate-settings");
  return { getRateSettings: () => Promise.resolve(DEFAULT_RATE_SETTINGS) };
});

vi.mock("@/lib/site-settings.server", () => ({
  getBookingMode: vi.fn(async () => "online" as const),
}));

import { resetRateLimits } from "@/lib/rate-limit";
import { POST } from "@/app/api/reservations/transfer/route";

function form(fields: Record<string, string>, file?: File) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  if (file) fd.append("comprobante", file);
  return new Request("http://t/api/reservations/transfer", { method: "POST", body: fd });
}

const VALID = {
  unitId: "tatu", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: "4",
  firstName: "Juan", lastName: "Pérez", email: "juan@test.com", phone: "+54",
  locale: "pt",
};
const goodFile = () => new File([new Uint8Array([1, 2, 3])], "c.jpg", { type: "image/jpeg" });

beforeEach(() => {
  resetRateLimits();
  vi.clearAllMocks();
  isRangeAvailable.mockResolvedValue(true);
  uploadComprobante.mockResolvedValue("tatu-path/x.jpg");
  createPendingEvent.mockResolvedValue({ eventId: "evt-1" });
  insertReservation.mockResolvedValue(undefined);
});

describe("POST /api/reservations/transfer", () => {
  it("happy path → 200 pending + code, en orden disponibilidad→upload→evento→insert", async () => {
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.code).toMatch(/^ARM-\d{4}-[A-Z2-9]{4}$/);
    expect(isRangeAvailable).toHaveBeenCalledOnce();
    expect(uploadComprobante).toHaveBeenCalledOnce();
    expect(createPendingEvent).toHaveBeenCalledOnce();
    expect(insertReservation).toHaveBeenCalledOnce();
  });

  it("400 si falta el comprobante", async () => {
    const res = await POST(form(VALID));
    expect(res.status).toBe(400);
    expect(isRangeAvailable).not.toHaveBeenCalled();
  });

  it("400 si el tipo de archivo no está permitido", async () => {
    const bad = new File([new Uint8Array([1])], "c.txt", { type: "text/plain" });
    const res = await POST(form(VALID, bad));
    expect(res.status).toBe(400);
  });

  it("400 si el archivo supera 6 MB", async () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024 + 1)], "c.jpg", { type: "image/jpeg" });
    const res = await POST(form(VALID, big));
    expect(res.status).toBe(400);
  });

  it("400 si el payload de reserva es inválido", async () => {
    const res = await POST(form({ ...VALID, email: "no-es-email" }, goodFile()));
    expect(res.status).toBe(400);
  });

  it("409 si las fechas ya no están disponibles", async () => {
    isRangeAvailable.mockResolvedValue(false);
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(409);
    expect(uploadComprobante).not.toHaveBeenCalled();
  });

  it("502 fail-closed si el re-chequeo lanza", async () => {
    isRangeAvailable.mockRejectedValue(new Error("cal down"));
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(502);
  });

  it("502 si la subida del comprobante falla (no crea evento)", async () => {
    uploadComprobante.mockRejectedValue(new Error("storage down"));
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(502);
    expect(createPendingEvent).not.toHaveBeenCalled();
  });

  it("502 + revierte (borra evento y comprobante) si el insert falla", async () => {
    insertReservation.mockRejectedValue(new Error("db down"));
    const res = await POST(form(VALID, goodFile()));
    expect(res.status).toBe(502);
    expect(deleteEvent).toHaveBeenCalledWith("tatu", "evt-1");
    expect(removeComprobante).toHaveBeenCalledWith("tatu-path/x.jpg");
  });

  it("propaga locale al insert (default es si falta o es inválido)", async () => {
    await POST(form(VALID, goodFile()));
    expect(insertReservation.mock.calls[0][0].locale).toBe("pt");

    const { locale: _omit, ...noLocale } = VALID;
    await POST(form(noLocale, goodFile()));
    expect(insertReservation.mock.calls[1][0].locale).toBe("es");

    await POST(form({ ...VALID, locale: "xx" }, goodFile()));
    expect(insertReservation.mock.calls[2][0].locale).toBe("es");
  });

  it("en modo whatsapp responde 503 y no acepta la transferencia", async () => {
    const { getBookingMode } = await import("@/lib/site-settings.server");
    vi.mocked(getBookingMode).mockResolvedValueOnce("whatsapp");

    const res = await POST(form(VALID, goodFile()));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "bookings_paused" });
    expect(isRangeAvailable).not.toHaveBeenCalled();
    expect(uploadComprobante).not.toHaveBeenCalled();
  });
});
