import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

const generateBookingCode = vi.fn();
vi.mock("@/lib/reservation/code", () => ({ generateBookingCode }));

beforeEach(() => {
  maybeSingle.mockReset();
  generateBookingCode.mockReset();
});

describe("codeExists", () => {
  it("es true si la fila existe", async () => {
    maybeSingle.mockResolvedValue({ data: { code: "ARM-2026-ABCD" }, error: null });
    const { codeExists } = await import("@/lib/reservation/reservations.server");
    expect(await codeExists("ARM-2026-ABCD")).toBe(true);
  });

  it("es false si no existe", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { codeExists } = await import("@/lib/reservation/reservations.server");
    expect(await codeExists("ARM-2026-ZZZZ")).toBe(false);
  });

  it("propaga el error de la DB en vez de asumir que está libre", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { codeExists } = await import("@/lib/reservation/reservations.server");
    await expect(codeExists("ARM-2026-ZZZZ")).rejects.toThrow(/boom/);
  });
});

describe("generateUniqueBookingCode", () => {
  it("devuelve el primer código si está libre", async () => {
    generateBookingCode.mockReturnValue("ARM-2026-AAAA");
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { generateUniqueBookingCode } = await import("@/lib/reservation/reservations.server");

    expect(await generateUniqueBookingCode()).toBe("ARM-2026-AAAA");
    expect(generateBookingCode).toHaveBeenCalledTimes(1);
  });

  it("reintenta cuando choca y devuelve el primero libre", async () => {
    generateBookingCode
      .mockReturnValueOnce("ARM-2026-AAAA")
      .mockReturnValueOnce("ARM-2026-BBBB");
    maybeSingle
      .mockResolvedValueOnce({ data: { code: "ARM-2026-AAAA" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const { generateUniqueBookingCode } = await import("@/lib/reservation/reservations.server");

    expect(await generateUniqueBookingCode()).toBe("ARM-2026-BBBB");
    expect(generateBookingCode).toHaveBeenCalledTimes(2);
  });

  it("tira si agota los intentos, para cortar ANTES de cobrar", async () => {
    generateBookingCode.mockReturnValue("ARM-2026-AAAA");
    maybeSingle.mockResolvedValue({ data: { code: "ARM-2026-AAAA" }, error: null });
    const { generateUniqueBookingCode } = await import("@/lib/reservation/reservations.server");

    await expect(generateUniqueBookingCode(3)).rejects.toThrow(/c[oó]digo libre/i);
    expect(generateBookingCode).toHaveBeenCalledTimes(3);
  });
});
