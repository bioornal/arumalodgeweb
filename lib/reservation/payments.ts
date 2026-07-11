import type { UnitId } from "./reducer";

export type CardData = { token: string; paymentMethodId: string; issuerId?: string; installments: number; deviceId?: string };
export type MockData = { mockOutcome: "approved" | "pending" | "rejected" };

export type PaymentRequest = {
  unitId: UnitId;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  payment: CardData | MockData;
  locale: "es" | "en" | "pt";
};

export type PaymentResult =
  | { status: "approved"; code: string }
  | { status: "pending"; code: string }
  | { status: "rejected"; detail: string | null }
  | { status: "error"; error: "conflict" | "validation" | "server" };

/** Crea el pago vía POST /api/payments y mapea HTTP → resultado tipado. */
export async function createPayment(req: PaymentRequest): Promise<PaymentResult> {
  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = (await res.json()) as
        | { status: "approved"; code: string }
        | { status: "pending"; code: string }
        | { status: "rejected"; detail: string | null };
      if (data.status === "approved" && data.code) return { status: "approved", code: data.code };
      if (data.status === "pending" && data.code) return { status: "pending", code: data.code };
      if (data.status === "rejected") return { status: "rejected", detail: data.detail ?? null };
      return { status: "error", error: "server" };
    }
    if (res.status === 409) return { status: "error", error: "conflict" };
    if (res.status === 400) return { status: "error", error: "validation" };
    return { status: "error", error: "server" };
  } catch {
    return { status: "error", error: "server" };
  }
}
