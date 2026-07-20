"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";
// Monto solo COSMÉTICO (lo que muestra el Brick). El monto real que se cobra
// está fijo en el server (/api/admin/test-payment) y no viaja desde acá.
const TEST_AMOUNT = 1000;

type Result = {
  status: string;
  statusDetail: string | null;
  paymentId: string;
  code: string;
};

export function TestPaymentBrick({ adminEmail }: { adminEmail: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (PUBLIC_KEY) initMercadoPago(PUBLIC_KEY, { locale: "es-AR" });
  }, []);

  // Script de seguridad de MP: expone window.MP_DEVICE_SESSION_ID (antifraude).
  useEffect(() => {
    if (document.getElementById("mp-security")) return;
    const s = document.createElement("script");
    s.id = "mp-security";
    s.src = "https://www.mercadopago.com/v2/security.js";
    s.setAttribute("view", "checkout");
    document.body.appendChild(s);
  }, []);

  if (!PUBLIC_KEY) {
    return (
      <div role="alert" style={alertStyle("#f7e9e2", "#e0b9a6", "#8a3b1d")}>
        Falta NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY en el entorno: cargala en Netlify
        (credencial productiva) y redeployá.
      </div>
    );
  }

  if (result) {
    const ok = result.status === "approved";
    return (
      <div>
        <div role="status" style={alertStyle(ok ? "#eaf3ea" : "#f7e9e2", ok ? "#b9d4b9" : "#e0b9a6", ok ? "#2f5d33" : "#8a3b1d")}>
          <strong>{ok ? "✔ Pago aprobado" : `Estado: ${result.status}`}</strong>
          {result.statusDetail && <div style={{ marginTop: 4 }}>Detalle: {result.statusDetail}</div>}
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12 }}>
            payment_id: {result.paymentId} · ref: {result.code}
          </div>
        </div>
        {ok && (
          <p style={{ fontSize: 13, color: "#6b665d", marginTop: 14 }}>
            Integración productiva validada. Ahora: (1) verificá el webhook 200 en el panel
            de MP (Webhooks → Notificaciones), (2){" "}
            <a href="https://www.mercadopago.com.ar/activities" target="_blank" rel="noreferrer">
              reembolsá este pago
            </a>.
          </p>
        )}
        <button type="button" onClick={() => { setResult(null); setError(null); }}
          style={{ marginTop: 12, background: "transparent", border: "1px solid #E7E0D4",
            borderRadius: 4, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#6b665d" }}>
          Hacer otra prueba
        </button>
      </div>
    );
  }

  return (
    <div>
      <Payment
        initialization={{ amount: TEST_AMOUNT, payer: { email: adminEmail } }}
        customization={{ paymentMethods: { creditCard: "all", debitCard: "all", maxInstallments: 1 } }}
        onSubmit={async (formData) => {
          setError(null);
          setProcessing(true);
          try {
            const fd = formData.formData;
            const res = await fetch("/api/admin/test-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: fd.token,
                paymentMethodId: fd.payment_method_id,
                issuerId: fd.issuer_id ?? undefined,
                payerEmail: fd.payer?.email ?? undefined,
                deviceId:
                  (window as unknown as { MP_DEVICE_SESSION_ID?: string })
                    .MP_DEVICE_SESSION_ID ?? undefined,
              }),
            });
            if (!res.ok) {
              setError(`El cobro falló (HTTP ${res.status}). Revisá las credenciales en Netlify y los logs.`);
            } else {
              setResult((await res.json()) as Result);
            }
          } catch {
            setError("Error de red al procesar el pago.");
          } finally {
            setProcessing(false);
          }
        }}
        onError={() => setError("El Brick de MP reportó un error (¿public key productiva cargada?).")}
      />
      {processing && <p style={{ fontSize: 13, color: "#6b665d", marginTop: 12 }}>Procesando…</p>}
      {error && <div role="alert" style={{ ...alertStyle("#f7e9e2", "#e0b9a6", "#8a3b1d"), marginTop: 18 }}>{error}</div>}
    </div>
  );
}

function alertStyle(bg: string, border: string, color: string): React.CSSProperties {
  return { padding: "12px 16px", borderRadius: 6, background: bg, border: `1px solid ${border}`, color, fontSize: 13 };
}
