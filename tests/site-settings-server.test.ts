import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const maybeSingle = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  }),
}));

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_BOOKING_MODE;

async function freshModule() {
  vi.resetModules();
  return import("@/lib/site-settings.server");
}

beforeEach(() => {
  maybeSingle.mockReset();
  upsert.mockReset();
  delete process.env.NEXT_PUBLIC_BOOKING_MODE;
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.NEXT_PUBLIC_BOOKING_MODE;
  else process.env.NEXT_PUBLIC_BOOKING_MODE = ORIGINAL_ENV;
});

describe("getSiteSettings", () => {
  it("lee el modo de la fila id=1", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("online");
  });

  it("memoiza: dos llamadas seguidas pegan una sola vez a la DB", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getSiteSettings } = await freshModule();
    await getSiteSettings();
    await getSiteSettings();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("FAIL-SAFE: si la DB devuelve error cae a whatsapp, no a online", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });

  it("FAIL-SAFE: si la DB tira una excepción cae a whatsapp", async () => {
    maybeSingle.mockRejectedValue(new Error("network down"));
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });

  it("FAIL-SAFE: un error tras vencer el TTL del memo 'online' NO lo conserva", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
      const { getSiteSettings } = await freshModule();
      expect((await getSiteSettings()).bookingMode).toBe("online"); // memo = { at: 0, value: online }

      vi.setSystemTime(30_001); // TTL (30s) vencido: memo sigue no-null, pero stale
      maybeSingle.mockRejectedValue(new Error("network down"));
      expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
    } finally {
      vi.useRealTimers();
    }
  });

  it("sin fila (tabla vacía) cae al default cerrado", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });
});

describe("getBookingMode", () => {
  it("sin env var devuelve lo que dice la DB", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getBookingMode } = await freshModule();
    expect(await getBookingMode()).toBe("online");
  });

  it("KILL-SWITCH: la env var le gana a la DB", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    process.env.NEXT_PUBLIC_BOOKING_MODE = "whatsapp";
    const { getBookingMode } = await freshModule();
    expect(await getBookingMode()).toBe("whatsapp");
  });

  it("una env var con basura NO cuenta como override", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    process.env.NEXT_PUBLIC_BOOKING_MODE = "";
    const { getBookingMode } = await freshModule();
    expect(await getBookingMode()).toBe("online");
  });
});

describe("saveSiteSettings", () => {
  it("hace upsert de la fila id=1 e invalida el memo", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "whatsapp" }, error: null });
    upsert.mockResolvedValue({ error: null });
    const { getSiteSettings, saveSiteSettings } = await freshModule();

    await getSiteSettings(); // llena el memo con whatsapp
    await saveSiteSettings({ bookingMode: "online" });
    expect(upsert).toHaveBeenCalledWith({ id: 1, booking_mode: "online" });

    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    expect((await getSiteSettings()).bookingMode).toBe("online");
  });

  it("propaga el error de la DB para que el panel lo muestre", async () => {
    upsert.mockResolvedValue({ error: { message: "permission denied" } });
    const { saveSiteSettings } = await freshModule();
    await expect(saveSiteSettings({ bookingMode: "online" })).rejects.toThrow(/permission denied/);
  });
});
