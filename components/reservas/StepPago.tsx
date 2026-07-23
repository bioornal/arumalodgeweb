"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import type { State } from "@/lib/reservation/reducer";
import { createPayment, type PaymentResult } from "@/lib/reservation/payments";
import { formatDateOnly } from "@/lib/reservation/booking";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { computeNights } from "@/lib/reservation/pricing";
import { methodTotal, type PaymentMethod } from "@/lib/reservation/method-pricing";
import { StepTransferencia } from "./StepTransferencia";

const MOCK = process.env.NEXT_PUBLIC_PAYMENTS_MOCK === "1";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";

interface StepPagoProps {
  state: State;
  settings: RateSettings;
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  onApproved: (code: string) => void;
  onPending: (code: string) => void;
}

export function StepPago({ state, settings, method, onMethodChange, onApproved, onPending }: StepPagoProps) {
  const t = useTranslations("reservas");
  const tLegal = useTranslations("legal");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const nights = computeNights(state.checkIn, state.checkOut);
  // Total del método TARJETA (precio de lista): es lo que muestra este paso y
  // lo que cobra el Brick. El de transferencia lo muestra StepTransferencia.
  const total = methodTotal(settings, "card", state.unitId, nights);

  useEffect(() => {
    if (!MOCK && PUBLIC_KEY) initMercadoPago(PUBLIC_KEY, { locale: "es-AR" });
  }, []);

  // Script de seguridad de MP: expone window.MP_DEVICE_SESSION_ID (antifraude).
  useEffect(() => {
    if (MOCK) return;
    if (document.getElementById("mp-security")) return;
    const s = document.createElement("script");
    s.id = "mp-security";
    s.src = "https://www.mercadopago.com/v2/security.js";
    s.setAttribute("view", "checkout");
    document.body.appendChild(s);
  }, []);

  const base = {
    unitId: state.unitId,
    checkIn: formatDateOnly(state.checkIn!),
    checkOut: formatDateOnly(state.checkOut!),
    guests: state.guests,
    firstName: state.firstName,
    lastName: state.lastName,
    email: state.email,
    phone: state.phone,
    locale: locale as "es" | "en" | "pt",
  };

  const handleResult = (res: PaymentResult) => {
    if (res.status === "approved") return onApproved(res.code);
    if (res.status === "pending") return onPending(res.code);
    if (res.status === "rejected") return setError(t("payRejected"));
    setError(res.error === "conflict" ? t("errConflict") : t("payErrorServer"));
  };

  if (MOCK) {
    const sim = async (mockOutcome: "approved" | "pending" | "rejected") => {
      setError(null);
      setProcessing(true);
      const res = await createPayment({ ...base, payment: { mockOutcome } });
      setProcessing(false);
      handleResult(res);
    };
    return (
      <div>
        <Header t={t} total={total} />
        <div style={{ padding: "14px 16px", borderRadius: 6, background: "#fef6e7",
          border: "1px solid #e9d6a8", color: "#7a5a18", fontSize: 13, marginBottom: 18 }}>
          {t("payTestMode")}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" disabled={processing} onClick={() => sim("approved")} style={btn("#23362B")}>
            {t("payTestApprove")}
          </button>
          <button type="button" disabled={processing} onClick={() => sim("rejected")} style={btn("#8a3b1d")}>
            {t("payTestReject")}
          </button>
          <button type="button" disabled={processing} onClick={() => sim("pending")} style={btn("#9A7B4F")}>
            {t("payTestPending")}
          </button>
        </div>
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  return (
    <div>
      <MethodTabs method={method} setMethod={onMethodChange} t={t} />
      {method === "transfer" ? (
        <StepTransferencia state={state} settings={settings} onPending={onPending} />
      ) : (
        <>
          <Header t={t} total={total} />
          <Payment
            initialization={{ amount: total, payer: { email: state.email } }}
            customization={{ paymentMethods: { creditCard: "all", debitCard: "all" } }}
            onSubmit={async (formData) => {
              setError(null);
              setProcessing(true);
              const fd = formData.formData;
              const res = await createPayment({
                ...base,
                payment: {
                  token: fd.token,
                  paymentMethodId: fd.payment_method_id,
                  issuerId: fd.issuer_id ?? undefined,
                  installments: fd.installments ?? 1,
                  deviceId:
                    (window as unknown as { MP_DEVICE_SESSION_ID?: string })
                      .MP_DEVICE_SESSION_ID ?? undefined,
                },
              });
              setProcessing(false);
              handleResult(res);
            }}
            onError={() => setError(t("payErrorServer"))}
          />
          {processing && <p style={{ fontSize: 13, color: "#6b665d", marginTop: 12 }}>{t("payProcessing")}</p>}
          {error && <ErrorBox msg={error} />}
        </>
      )}
      <p style={{ fontSize: 12, color: "#7e9184", marginTop: 14, lineHeight: 1.6 }}>
        {tLegal("cancelDisclaimerLead")}{" "}
        <a href={`/${locale}/politicas/cancelacion`} target="_blank" rel="noopener" style={{ color: "#9DBF9E" }}>
          {tLegal("cancelDisclaimerLink")}
        </a>
        .
      </p>
    </div>
  );
}

function MethodTabs({ method, setMethod, t }: {
  method: "card" | "transfer";
  setMethod: (m: "card" | "transfer") => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "12px 14px", textAlign: "center", cursor: "pointer",
    fontSize: 13, letterSpacing: ".04em", borderRadius: 4,
    border: active ? "1px solid #23362B" : "1px solid #E7E0D4",
    background: active ? "#23362B" : "transparent",
    color: active ? "#F8F5F0" : "#6b665d",
  });
  return (
    <div>
      <div style={{ fontSize: 13, color: "#6b665d", marginBottom: 10 }}>{t("payMethodTitle")}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
        <button type="button" style={tab(method === "card")} onClick={() => setMethod("card")}>
          {t("payMethodCard")}
        </button>
        <button type="button" style={tab(method === "transfer")} onClick={() => setMethod("transfer")}>
          {t("payMethodTransfer")}
        </button>
      </div>
    </div>
  );
}

function Header({ t, total }: { t: ReturnType<typeof useTranslations>; total: number }) {
  return (
    <>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 26, margin: "0 0 6px" }}>
        {t("payTitle")}
      </h3>
      <p style={{ fontSize: 13, color: "#6b665d", margin: "0 0 22px" }}>
        {t("paySubtitle")} — ${new Intl.NumberFormat("es-AR").format(total)}
      </p>
    </>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div role="alert" style={{ marginTop: 18, padding: "12px 16px", borderRadius: 6,
      background: "#f7e9e2", border: "1px solid #e0b9a6", color: "#8a3b1d", fontSize: 13 }}>
      {msg}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#F8F5F0", border: "none", cursor: "pointer",
    fontFamily: "'Manrope', sans-serif", fontSize: 12.5, letterSpacing: ".06em",
    padding: "13px 22px", borderRadius: 3,
  };
}
