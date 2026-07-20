import { describe, it, expect, vi, beforeEach } from "vitest";

const getAdminUser = vi.fn();
vi.mock("@/lib/admin/auth", () => ({
  getAdminUser: (...a: unknown[]) => getAdminUser(...a),
}));

const createCardPayment = vi.fn();
vi.mock("@/lib/reservation/payments.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reservation/payments.server")>(
    "@/lib/reservation/payments.server",
  );
  return { ...actual, createCardPayment: (...a: unknown[]) => createCardPayment(...a) };
});

import { POST } from "@/app/api/admin/test-payment/route";

const ADMIN = { email: "admin@aruma.test" };
const CARD_BODY = {
  token: "tok_123",
  paymentMethodId: "master",
  issuerId: "310",
  deviceId: "dev_abc",
};

function req(body: unknown) {
  return new Request("http://t/api/admin/test-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getAdminUser.mockReset();
  createCardPayment.mockReset();
});

describe("POST /api/admin/test-payment", () => {
  it("401 sin admin autenticado (defensa en profundidad)", async () => {
    getAdminUser.mockResolvedValue(null);
    const res = await POST(req(CARD_BODY));
    expect(res.status).toBe(401);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("400 con body inválido (sin token)", async () => {
    getAdminUser.mockResolvedValue(ADMIN);
    const res = await POST(req({ paymentMethodId: "master" }));
    expect(res.status).toBe(400);
    expect(createCardPayment).not.toHaveBeenCalled();
  });

  it("cobra EXACTAMENTE $1000 con code TEST- y metadata de prueba sin unit_id", async () => {
    getAdminUser.mockResolvedValue(ADMIN);
    createCardPayment.mockResolvedValue({ id: "pay-77", status: "approved" });

    const res = await POST(req(CARD_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("approved");
    expect(json.paymentId).toBe("pay-77");
    expect(json.code.startsWith("TEST-")).toBe(true);

    expect(createCardPayment).toHaveBeenCalledTimes(1);
    const input = createCardPayment.mock.calls[0][0] as Record<string, unknown>;
    expect(input.amount).toBe(1000);
    expect(input.installments).toBe(1);
    expect(input.statementDescriptor).toBe("ARUMALODGE");
    expect(String(input.code).startsWith("TEST-")).toBe(true);
    const meta = input.metadata as Record<string, unknown>;
    expect(meta.test_payment).toBe(true);
    expect("unit_id" in meta).toBe(false); // el webhook debe hacer no-op
    expect(input.payerEmail).toBe(ADMIN.email); // fallback al email del admin
    expect(input.deviceId).toBe("dev_abc");
  });

  it("propaga rejected con statusDetail", async () => {
    getAdminUser.mockResolvedValue(ADMIN);
    createCardPayment.mockResolvedValue({
      id: "pay-88",
      status: "rejected",
      statusDetail: "cc_rejected_insufficient_amount",
    });
    const res = await POST(req(CARD_BODY));
    const json = await res.json();
    expect(json.status).toBe("rejected");
    expect(json.statusDetail).toBe("cc_rejected_insufficient_amount");
  });

  it("502 si el cobro tira excepción", async () => {
    getAdminUser.mockResolvedValue(ADMIN);
    createCardPayment.mockRejectedValue(new Error("mp caido"));
    const res = await POST(req(CARD_BODY));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("payment");
  });
});
