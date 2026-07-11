import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  // function expression (no arrow): el mock se invoca con `new Resend(...)`
  Resend: vi.fn().mockImplementation(function () { return { emails: { send } }; }),
}));

const markConfirmationEmailSent = vi.fn();
vi.mock("@/lib/reservation/reservations.server", () => ({
  markConfirmationEmailSent: (...a: unknown[]) => markConfirmationEmailSent(...a),
}));

import { sendConfirmationEmailOnce } from "@/lib/reservation/email.server";

const ROW = {
  code: "ARM-2026-AB12", unit_name: "Casa Tatú", first_name: "Juan",
  email: "juan@test.com",
  check_in: "2026-07-02", check_out: "2026-07-05", nights: 3, guests: 4,
  total: 480000, locale: "es",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("ARUMA_EMAIL_FROM", "Aruma <test@aruma.test>");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://aruma.test");
  send.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("sendConfirmationEmailOnce", () => {
  it("flip ganado → envía una vez con los datos correctos", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    await sendConfirmationEmailOnce("ARM-2026-AB12");
    expect(send).toHaveBeenCalledOnce();
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe("juan@test.com");
    expect(arg.subject).toContain("ARM-2026-AB12");
    expect(arg.html).toContain("https://aruma.test/es/mi-reserva?code=ARM-2026-AB12");
  });

  it("flip no ganado (null) → no envía (dedup)", async () => {
    markConfirmationEmailSent.mockResolvedValue(null);
    await sendConfirmationEmailOnce("ARM-2026-AB12");
    expect(send).not.toHaveBeenCalled();
  });

  it("fail-soft: si Resend rechaza, no lanza", async () => {
    markConfirmationEmailSent.mockResolvedValue(ROW);
    send.mockRejectedValue(new Error("resend down"));
    await expect(sendConfirmationEmailOnce("ARM-2026-AB12")).resolves.toBeUndefined();
  });

  it("sin RESEND_API_KEY → no envía ni marca, no lanza", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendConfirmationEmailOnce("ARM-2026-AB12");
    expect(markConfirmationEmailSent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
