import type { ReservationStatus, PaymentMethod } from "./reservations.server";

export type StatusKey = "confirmed" | "inVerification" | "paymentPending" | "cancelled";

/** Deriva la clave de estado para la UI/i18n a partir del estado y el método de pago. */
export function resolveStatusKey(
  status: ReservationStatus,
  method: PaymentMethod,
): StatusKey {
  if (status === "released") return "cancelled";
  if (status === "confirmed") return "confirmed";
  return method === "transfer" ? "inVerification" : "paymentPending";
}
