import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Link } from "@/lib/i18n/navigation";
import type { State } from "@/lib/reservation/reducer";
import { getUnit } from "@/lib/units";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { computeNights, computeTotal } from "@/lib/reservation/pricing";

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

interface ConfirmacionProps {
  state: State;
  settings: RateSettings;
  code: string;
  pending?: boolean;
}

export function Confirmacion({ state, settings, code, pending }: ConfirmacionProps) {
  const t = useTranslations("reservas");
  const unit = getUnit(state.unitId)!;
  const nights = computeNights(state.checkIn, state.checkOut);
  const total = computeTotal(settings.nightly[state.unitId], nights, settings.cleaningFee);

  const formatDate = (d: Date) => format(d, "d MMM");
  const rangeLabel =
    state.checkIn && state.checkOut
      ? `${formatDate(state.checkIn)} – ${formatDate(state.checkOut)}`
      : "—";

  const guestsLabel = `${state.guests} ${state.guests === 1 ? t("adult") : t("adults")}`;

  const title = pending ? t("payPendingTitle") : t("confirmedTitle");
  const sub = pending ? t("payPendingSub") : t("confirmedSub");

  return (
    <div
      style={{
        maxWidth: 620,
        margin: "24px auto 0",
        background: "#23362B",
        borderRadius: 8,
        padding: "56px 48px",
        textAlign: "center",
        color: "#E8E1D5",
        boxShadow: "0 50px 90px -55px rgba(29,29,29,.6)",
      }}
    >
      {/* Check circle */}
      <div
        style={{
          width: 70,
          height: 70,
          border: "2px solid #9DBF9E",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9DBF9E",
          fontSize: 32,
          margin: "0 auto",
        }}
      >
        ✓
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 400,
          fontSize: 40,
          margin: "26px 0 0",
          color: "#F8F5F0",
        }}
      >
        {title}
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          fontWeight: 300,
          color: "#bcd0bd",
          margin: "14px auto 0",
          maxWidth: "42ch",
        }}
      >
        {sub}
      </p>

      {/* Summary card */}
      <div
        style={{
          background: "rgba(255,255,255,.05)",
          border: "1px solid #3a4d40",
          borderRadius: 6,
          padding: 24,
          margin: "34px 0 0",
          textAlign: "left",
        }}
      >
        {/* Code (también sirve de referencia cuando el pago quedó pendiente) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
          }}
        >
          <span style={{ color: "#9fb0a3" }}>{t("code")}</span>
          <span style={{ color: "#F8F5F0", letterSpacing: ".08em" }}>{code}</span>
        </div>

        {/* Accommodation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
            borderTop: pending ? undefined : "1px solid #34433a",
          }}
        >
          <span style={{ color: "#9fb0a3" }}>{t("accommodation")}</span>
          <span style={{ color: "#F8F5F0" }}>{unit.name}</span>
        </div>

        {/* Dates */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
            borderTop: "1px solid #34433a",
          }}
        >
          <span style={{ color: "#9fb0a3" }}>{t("dates")}</span>
          <span style={{ color: "#F8F5F0" }}>{rangeLabel}</span>
        </div>

        {/* Guests */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 0",
            fontSize: 14,
            borderTop: "1px solid #34433a",
          }}
        >
          <span style={{ color: "#9fb0a3" }}>{t("guests")}</span>
          <span style={{ color: "#F8F5F0" }}>{guestsLabel}</span>
        </div>

        {/* Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "13px 0 4px",
            fontSize: 16,
            borderTop: "1px solid #34433a",
            marginTop: 6,
          }}
        >
          <span
            style={{
              color: "#F8F5F0",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22,
            }}
          >
            Total
          </span>
          <span
            style={{
              color: "#F8F5F0",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22,
            }}
          >
            {nights > 0 ? money(total) : "—"}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "center",
          marginTop: 32,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            background: "#A04B2A",
            color: "#F8F5F0",
            textDecoration: "none",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "14px 30px",
            borderRadius: 3,
            transition: "background .35s",
          }}
        >
          {t("backHome")}
        </Link>
        <Link
          href="/tarifas"
          style={{
            background: "transparent",
            color: "#cdd8cf",
            border: "1px solid #3f5346",
            textDecoration: "none",
            fontFamily: "'Manrope', sans-serif",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            padding: "14px 28px",
            borderRadius: 3,
            transition: "border-color .3s",
          }}
        >
          {t("newRes")}
        </Link>
      </div>

      {/* Link a la consulta de estado */}
      <p style={{ marginTop: 22, fontSize: 13 }}>
        <Link href="/mi-reserva" style={{ color: "#9DBF9E", textDecoration: "underline" }}>
          {t("checkStatus")}
        </Link>
      </p>
    </div>
  );
}
