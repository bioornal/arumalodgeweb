"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReservationView } from "@/lib/reservation/lookup.server";
import { resolveStatusKey, type StatusKey } from "@/lib/reservation/status-view";

import { waLink } from "@/lib/contact";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

function fmtDate(d: string, locale: string) {
  const [y, m, day] = d.split("-").map(Number);
  // Construido como fecha local para evitar el corrimiento de TZ de "YYYY-MM-DD" (UTC).
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(y, m - 1, day),
  );
}

const STATUS_LABEL: Record<StatusKey, string> = {
  confirmed: "statusConfirmed",
  inVerification: "statusInVerification",
  paymentPending: "statusPaymentPending",
  cancelled: "statusCancelled",
};
const STATUS_MSG: Record<StatusKey, string> = {
  confirmed: "msgConfirmed",
  inVerification: "msgInVerification",
  paymentPending: "msgPaymentPending",
  cancelled: "msgCancelled",
};

export function ReservaEstado({
  view,
  onReset,
}: {
  view: ReservationView;
  onReset: () => void;
}) {
  const t = useTranslations("miReserva");
  const locale = useLocale();
  const key = resolveStatusKey(view.status, view.paymentMethod);

  const waHref = waLink(`Hola, quiero consultar/modificar mi reserva ${view.code}`);

  const row = (label: string, value: string, top = true) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        fontSize: 14,
        borderTop: top ? "1px solid #34433a" : undefined,
      }}
    >
      <span style={{ color: "#9fb0a3" }}>{label}</span>
      <span style={{ color: "#F8F5F0" }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 620,
        margin: "24px auto 0",
        background: "#23362B",
        borderRadius: 8,
        padding: "48px 44px",
        color: "#E8E1D5",
        boxShadow: "0 50px 90px -55px rgba(29,29,29,.6)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: "#9DBF9E",
            border: "1px solid #3f5346",
            borderRadius: 999,
            padding: "6px 16px",
          }}
        >
          {t(STATUS_LABEL[key])}
        </div>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            fontWeight: 300,
            color: "#bcd0bd",
            margin: "16px auto 0",
            maxWidth: "42ch",
          }}
        >
          {t(STATUS_MSG[key])}
        </p>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,.05)",
          border: "1px solid #3a4d40",
          borderRadius: 6,
          padding: 24,
          margin: "28px 0 0",
        }}
      >
        {row(t("labelCode"), view.code, false)}
        {row(t("labelAccommodation"), view.unitName)}
        {row(t("labelDates"), `${fmtDate(view.checkIn, locale)} – ${fmtDate(view.checkOut, locale)}`)}
        {row(t("labelGuests"), String(view.guests))}
        {row(t("labelTotal"), money(view.total))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "center",
          marginTop: 28,
          flexWrap: "wrap",
        }}
      >
        <a
          href={waHref}
          target="_blank"
          rel="noopener"
          style={{
            background: "#A04B2A",
            color: "#F8F5F0",
            textDecoration: "none",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "14px 30px",
            borderRadius: 3,
          }}
        >
          {t("whatsappCta")}
        </a>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: "transparent",
            color: "#cdd8cf",
            border: "1px solid #3f5346",
            fontFamily: "'Manrope', sans-serif",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "14px 28px",
            borderRadius: 3,
            cursor: "pointer",
          }}
        >
          {t("newQuery")}
        </button>
      </div>
    </div>
  );
}
