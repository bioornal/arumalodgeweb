import crypto from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";

// Solo server. No importar desde código cliente.

export type MPItem = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
};

export type CardPaymentInput = {
  amount: number;
  token: string;
  paymentMethodId: string;
  issuerId?: string;
  installments: number;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  description: string;
  code: string; // external_reference + idempotency key
  metadata: Record<string, unknown>;
  notificationUrl?: string;
  items?: MPItem[];
  statementDescriptor?: string;
  deviceId?: string;
};

export type PaymentOutcome = {
  id: string;
  status: string; // "approved" | "in_process" | "pending" | "rejected" | ...
  statusDetail?: string;
  externalReference?: string;
  metadata?: Record<string, unknown>;
};

export function isMockMode(): boolean {
  return process.env.PAYMENTS_MOCK === "1";
}

export type MockOutcome = "approved" | "pending" | "rejected";

/** Resultado emulado para el modo test (no llama a MP). */
export function mockPayment(outcome: MockOutcome, code: string): PaymentOutcome {
  return { id: `mock-${code}`, status: outcome, statusDetail: "mock", externalReference: code };
}

function client(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");
  return new MercadoPagoConfig({ accessToken });
}

export async function createCardPayment(input: CardPaymentInput): Promise<PaymentOutcome> {
  const payment = new Payment(client());
  const res = await payment.create({
    body: {
      transaction_amount: input.amount,
      token: input.token,
      description: input.description,
      installments: input.installments,
      payment_method_id: input.paymentMethodId,
      // issuer_id in the SDK create request is typed as number | undefined
      issuer_id: input.issuerId !== undefined ? Number(input.issuerId) : undefined,
      payer: {
        email: input.payerEmail,
        first_name: input.payerFirstName,
        last_name: input.payerLastName,
      },
      external_reference: input.code,
      metadata: input.metadata,
      notification_url: input.notificationUrl,
      // Cómo aparece el cargo en el resumen de la tarjeta (reduce contracargos).
      statement_descriptor: input.statementDescriptor,
      // Datos del ítem y del dispositivo: mejoran la tasa de aprobación (antifraude).
      additional_info: {
        items: input.items?.map((it) => ({
          id: it.id,
          title: it.title,
          description: it.description,
          category_id: it.categoryId,
          quantity: it.quantity,
          unit_price: it.unitPrice,
        })),
      },
    },
    requestOptions: {
      idempotencyKey: input.code,
      ...(input.deviceId
        ? { customHeaders: { "X-meli-session-id": input.deviceId } }
        : {}),
    },
  });
  return {
    id: String(res.id),
    status: String(res.status),
    statusDetail: res.status_detail ?? undefined,
    externalReference: res.external_reference ?? undefined,
    metadata: (res.metadata ?? undefined) as Record<string, unknown> | undefined,
  };
}

export async function getPayment(id: string): Promise<PaymentOutcome> {
  const payment = new Payment(client());
  const res = await payment.get({ id });
  return {
    id: String(res.id),
    status: String(res.status),
    statusDetail: res.status_detail ?? undefined,
    externalReference: res.external_reference ?? undefined,
    metadata: (res.metadata ?? undefined) as Record<string, unknown> | undefined,
  };
}

/**
 * Verifica la firma del webhook de MP.
 * Header `x-signature`: "ts=<unix>,v1=<hmac>". Manifest:
 * `id:<dataId>;request-id:<requestId>;ts:<ts>;`. HMAC-SHA256 con el secret del panel.
 */
export function verifyWebhookSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const { signatureHeader, requestId, dataId, secret } = params;
  if (!signatureHeader || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const eqIdx = kv.indexOf("=");
      if (eqIdx === -1) return [kv.trim(), ""];
      return [kv.slice(0, eqIdx).trim(), kv.slice(eqIdx + 1).trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
