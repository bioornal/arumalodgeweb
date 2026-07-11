import type { UnitId } from "./reducer";

export type TransferRequest = {
  unitId: UnitId;
  checkIn: string;
  checkOut: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  file: File;
  locale: "es" | "en" | "pt";
};

export type TransferResult =
  | { status: "pending"; code: string }
  | { status: "error"; error: "conflict" | "validation" | "server" };

/** Crea la reserva por transferencia vía POST multipart /api/reservations/transfer. */
export async function createTransferReservation(req: TransferRequest): Promise<TransferResult> {
  try {
    const fd = new FormData();
    fd.append("unitId", req.unitId);
    fd.append("checkIn", req.checkIn);
    fd.append("checkOut", req.checkOut);
    fd.append("guests", String(req.guests));
    fd.append("firstName", req.firstName);
    fd.append("lastName", req.lastName);
    fd.append("email", req.email);
    fd.append("phone", req.phone);
    fd.append("comprobante", req.file);
    fd.append("locale", req.locale);

    const res = await fetch("/api/reservations/transfer", { method: "POST", body: fd });
    if (res.ok) {
      const data = (await res.json()) as { status?: string; code?: string };
      if (data.status === "pending" && data.code) return { status: "pending", code: data.code };
      return { status: "error", error: "server" };
    }
    if (res.status === 409) return { status: "error", error: "conflict" };
    if (res.status === 400) return { status: "error", error: "validation" };
    return { status: "error", error: "server" };
  } catch {
    return { status: "error", error: "server" };
  }
}
