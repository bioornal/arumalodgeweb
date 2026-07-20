import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { State } from "@/lib/reservation/reducer";
import { getUnit } from "@/lib/units";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import {
  computeNights,
  computeSubtotal,
  computeTotal,
} from "@/lib/reservation/pricing";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

interface OrderSummaryProps {
  state: State;
  settings: RateSettings;
}

export function OrderSummary({ state, settings }: OrderSummaryProps) {
  const t = useTranslations("reservas");
  const unit = getUnit(state.unitId)!;
  const nights = computeNights(state.checkIn, state.checkOut);
  const nightly = settings.nightly[state.unitId];
  const subtotal = computeSubtotal(nightly, nights);
  const total = computeTotal(nightly, nights, settings.cleaningFee);

  // Format date range
  const formatDate = (d: Date) => format(d, "d MMM");
  const rangeLabel =
    state.checkIn && state.checkOut
      ? `${formatDate(state.checkIn)} – ${formatDate(state.checkOut)}`
      : "—";

  return (
    <div
      style={{
        background: "#23362B",
        color: "#E8E1D5",
        borderRadius: 8,
        padding: 30,
        boxShadow: "0 40px 80px -55px rgba(29,29,29,.5)",
      }}
    >
      {/* Kicker */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: "#9A7B4F",
        }}
      >
        {t("yourReservation")}
      </div>

      {/* Unit name */}
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28,
          color: "#F8F5F0",
          marginTop: 10,
        }}
      >
        {unit.name}
      </div>

      {/* Info rows */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "#9fb0a3" }}>{t("dates")}</span>
          <span style={{ color: "#F8F5F0", textAlign: "right" }}>{rangeLabel}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "#9fb0a3" }}>{t("nights")}</span>
          <span style={{ color: "#F8F5F0" }}>{nights > 0 ? String(nights) : "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "#9fb0a3" }}>{t("guests")}</span>
          <span style={{ color: "#F8F5F0" }}>
            {state.guests}{" "}
            {state.guests === 1 ? t("adult") : t("adults")}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #34433a", margin: "24px 0" }} />

      {/* Price breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "#9fb0a3" }}>
            {money(nightly)} × {nights || 0}
          </span>
          <span style={{ color: "#F8F5F0" }}>
            {nights > 0 ? money(subtotal) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "#9fb0a3" }}>{t("cleaning")}</span>
          <span style={{ color: "#F8F5F0" }}>
            {nights > 0 ? money(settings.cleaningFee) : "—"}
          </span>
        </div>
      </div>

      {/* Total */}
      <div style={{ borderTop: "1px solid #34433a", margin: "24px 0 0" }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 20,
        }}
      >
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: "#F8F5F0" }}>
          Total
        </span>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: "#F8F5F0" }}>
          {nights > 0 ? money(total) : "—"}
        </span>
      </div>

      {/* No fees note */}
      <div style={{ fontSize: 12, color: "#7e9184", marginTop: 10, lineHeight: 1.5 }}>
        {t("noFees")}
      </div>
    </div>
  );
}
