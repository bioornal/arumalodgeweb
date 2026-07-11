import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTransferReservation } from "@/lib/reservation/transfer";

beforeEach(() => { vi.restoreAllMocks(); });

const base = {
  unitId: "tatu" as const, checkIn: "2026-07-02", checkOut: "2026-07-05",
  guests: 4, firstName: "Juan", lastName: "Pérez", email: "j@t.com", phone: "+54",
  file: new File([new Uint8Array([1])], "c.jpg", { type: "image/jpeg" }),
  locale: "es" as const,
};

describe("createTransferReservation", () => {
  it("postea multipart y mapea 200 pending", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "pending", code: "ARM-2026-AB12" }), { status: 200 }),
    );
    const res = await createTransferReservation(base);
    expect(res).toEqual({ status: "pending", code: "ARM-2026-AB12" });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("mapea 409 → conflict", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 409 }));
    expect(await createTransferReservation(base)).toEqual({ status: "error", error: "conflict" });
  });

  it("mapea 400 → validation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));
    expect(await createTransferReservation(base)).toEqual({ status: "error", error: "validation" });
  });

  it("mapea excepción → server", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("net"));
    expect(await createTransferReservation(base)).toEqual({ status: "error", error: "server" });
  });
});
