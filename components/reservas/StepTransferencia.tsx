"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { State } from "@/lib/reservation/reducer";
import { createTransferReservation } from "@/lib/reservation/transfer";
import { formatDateOnly } from "@/lib/reservation/booking";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { computeNights, computeTotal } from "@/lib/reservation/pricing";
import { BANK_DETAILS } from "@/lib/site";

interface Props {
  state: State;
  settings: RateSettings;
  onPending: (code: string) => void;
}

export function StepTransferencia({ state, settings, onPending }: Props) {
  const t = useTranslations("reservas");
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const nights = computeNights(state.checkIn!, state.checkOut!);
  const total = computeTotal(settings.nightly[state.unitId], nights, settings.cleaningFee);
  const money = (n: number) => `$${new Intl.NumberFormat("es-AR").format(n)}`;

  const submit = async () => {
    if (!file) { setError(t("transferMissingFile")); return; }
    setError(null);
    setProcessing(true);
    const res = await createTransferReservation({
      unitId: state.unitId,
      checkIn: formatDateOnly(state.checkIn!),
      checkOut: formatDateOnly(state.checkOut!),
      guests: state.guests,
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      phone: state.phone,
      file,
      locale: locale as "es" | "en" | "pt",
    });
    setProcessing(false);
    if (res.status === "pending") return onPending(res.code);
    setError(res.error === "conflict" ? t("errConflict") : t("transferErrorServer"));
  };

  const row: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", gap: 16,
    padding: "11px 0", borderBottom: "1px solid #ece5d8", fontSize: 14,
  };

  return (
    <div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 26, margin: "0 0 6px" }}>
        {t("transferTitle")}
      </h3>
      <p style={{ fontSize: 13, color: "#6b665d", margin: "0 0 22px", lineHeight: 1.6 }}>
        {t("transferIntro")}
      </p>

      <div style={{ background: "#fbf8f2", border: "1px solid #ece5d8", borderRadius: 6, padding: "6px 18px", marginBottom: 22 }}>
        <div style={row}><span style={{ color: "#6b665d" }}>{t("transferAlias")}</span><strong>{BANK_DETAILS.alias}</strong></div>
        <div style={row}><span style={{ color: "#6b665d" }}>{t("transferCbu")}</span><strong>{BANK_DETAILS.cbu}</strong></div>
        <div style={row}><span style={{ color: "#6b665d" }}>{t("transferHolder")}</span><strong>{BANK_DETAILS.holder}</strong></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={{ color: "#6b665d" }}>{t("transferAmount")}</span><strong>{money(total)}</strong></div>
      </div>

      <label style={{ display: "block", fontSize: 13, color: "#6b665d", marginBottom: 8 }}>
        {t("transferUpload")}
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        style={{ fontSize: 13, marginBottom: 20 }}
      />

      <button
        type="button"
        onClick={submit}
        disabled={processing}
        style={{
          display: "block", width: "100%", background: processing ? "#d8cdbd" : "#23362B",
          color: "#F8F5F0", border: "none", cursor: processing ? "not-allowed" : "pointer",
          fontFamily: "'Manrope', sans-serif", fontSize: 12.5, letterSpacing: ".1em",
          textTransform: "uppercase", padding: "15px 30px", borderRadius: 3,
        }}
      >
        {processing ? t("transferProcessing") : t("transferSubmit")}
      </button>

      {error && (
        <div role="alert" style={{ marginTop: 18, padding: "12px 16px", borderRadius: 6,
          background: "#f7e9e2", border: "1px solid #e0b9a6", color: "#8a3b1d", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
