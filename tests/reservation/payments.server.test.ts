import { describe, it, expect, afterEach } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature, isMockMode, mockPayment, createCardPayment } from "@/lib/reservation/payments.server";

const SECRET = "test-secret";

function signed(dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyWebhookSignature", () => {
  it("acepta una firma válida", () => {
    const header = signed("12345", "req-1", "1700000000");
    const ok = verifyWebhookSignature({
      signatureHeader: header, requestId: "req-1", dataId: "12345", secret: SECRET,
    });
    expect(ok).toBe(true);
  });

  it("rechaza si el hash no coincide", () => {
    const header = "ts=1700000000,v1=deadbeef";
    const ok = verifyWebhookSignature({
      signatureHeader: header, requestId: "req-1", dataId: "12345", secret: SECRET,
    });
    expect(ok).toBe(false);
  });

  it("rechaza si falta el header o el secret", () => {
    expect(verifyWebhookSignature({ signatureHeader: null, requestId: "r", dataId: "1", secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ signatureHeader: "ts=1,v1=x", requestId: "r", dataId: "1", secret: "" })).toBe(false);
  });

  it("rechaza un hash de longitud correcta pero valor incorrecto", () => {
    const wrongV1 = "a".repeat(64);
    const ok = verifyWebhookSignature({
      signatureHeader: `ts=1700000000,v1=${wrongV1}`,
      requestId: "req-1", dataId: "12345", secret: SECRET,
    });
    expect(ok).toBe(false);
  });
});

describe("isMockMode", () => {
  it("true solo cuando PAYMENTS_MOCK === '1'", () => {
    process.env.PAYMENTS_MOCK = "1";
    expect(isMockMode()).toBe(true);
    process.env.PAYMENTS_MOCK = "0";
    expect(isMockMode()).toBe(false);
    delete process.env.PAYMENTS_MOCK;
    expect(isMockMode()).toBe(false);
  });
});

describe("mockPayment", () => {
  it("devuelve el estado pedido con un id sintético", () => {
    const out = mockPayment("approved", "ARM-2026-AB12");
    expect(out.status).toBe("approved");
    expect(out.id).toContain("mock");
  });
});

describe("createCardPayment (env guard)", () => {
  it("lanza si falta MERCADOPAGO_ACCESS_TOKEN", async () => {
    const prev = process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    await expect(
      createCardPayment({
        amount: 100, token: "tok", paymentMethodId: "visa", installments: 1,
        payerEmail: "a@b.com", description: "x", code: "ARM-2026-AB12", metadata: {},
      }),
    ).rejects.toThrow();
    if (prev !== undefined) process.env.MERCADOPAGO_ACCESS_TOKEN = prev;
  });
});

afterEach(() => { delete process.env.PAYMENTS_MOCK; });
