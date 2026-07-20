import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { createCardPayment } from "@/lib/reservation/payments.server";

// Cobro de PRUEBA de la integración productiva de MP, solo para el admin.
// El monto vive ACÁ y en ningún otro lado: esta ruta jamás cobra otro valor y
// no crea reservas (metadata sin unit_id → el webhook hace no-op), así que no
// puede usarse para abaratar una estadía. Reembolso manual desde el panel de MP.
const TEST_AMOUNT = 1000; // ARS

export async function POST(req: Request) {
  // Defensa en profundidad (el middleware ya bloquea /api/admin/*, re-verificamos).
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const { token, paymentMethodId, issuerId, deviceId, payerEmail } = body;
  if (typeof token !== "string" || !token || typeof paymentMethodId !== "string" || !paymentMethodId) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const code = `TEST-${Date.now()}`;
  const base = process.env.NEXT_PUBLIC_SITE_URL;

  try {
    const outcome = await createCardPayment({
      amount: TEST_AMOUNT,
      token,
      paymentMethodId,
      issuerId: typeof issuerId === "string" && issuerId ? issuerId : undefined,
      installments: 1,
      payerEmail: typeof payerEmail === "string" && payerEmail ? payerEmail : admin.email,
      description: "Prueba de integración Aruma Lodge",
      code,
      metadata: { test_payment: true },
      notificationUrl: base ? `${base}/api/webhooks/mercadopago` : undefined,
      statementDescriptor: "ARUMALODGE",
      deviceId: typeof deviceId === "string" && deviceId ? deviceId : undefined,
      items: [
        {
          id: "test-integracion",
          title: "Prueba de integración",
          description: "Pago de prueba reembolsable (no genera reserva)",
          categoryId: "travels",
          quantity: 1,
          unitPrice: TEST_AMOUNT,
        },
      ],
    });
    return NextResponse.json({
      status: outcome.status,
      statusDetail: outcome.statusDetail ?? null,
      paymentId: outcome.id,
      code,
    });
  } catch (err) {
    console.error("[admin/test-payment] cobro fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "payment" }, { status: 502 });
  }
}
