import { useTranslations } from "next-intl";
import type { Dispatch } from "react";
import type { State, Action, GuestField } from "@/lib/reservation/reducer";

const inputStyle: React.CSSProperties = {
  background: "#FBF9F5",
  border: "1px solid #d3c9b8",
  borderRadius: 4,
  padding: "14px 16px",
  fontFamily: "'Manrope', sans-serif",
  fontSize: 14,
  color: "#1D1D1D",
  outline: "none",
  width: "100%",
};

interface StepDatosProps {
  state: State;
  dispatch: Dispatch<Action>;
}

export function StepDatos({ state, dispatch }: StepDatosProps) {
  const t = useTranslations("reservas");
  const ph = t.raw("ph") as Record<string, string>;

  const AUTOCOMPLETE: Record<GuestField, string> = {
    firstName: "given-name",
    lastName: "family-name",
    email: "email",
    phone: "tel",
  };
  // El placeholder hace de nombre accesible (aria-label) ya que no hay <label> visible.
  const field = (f: GuestField, label: string) => ({
    value: state[f],
    "aria-label": label,
    autoComplete: AUTOCOMPLETE[f],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      dispatch({ type: "SET_GUEST_FIELD", field: f, value: e.target.value }),
  });

  return (
    <div>
      <h3
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 500,
          fontSize: 26,
          margin: "0 0 24px",
        }}
      >
        {t("yourData")}
      </h3>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <input type="text" placeholder={ph.nombre} style={inputStyle} {...field("firstName", ph.nombre)} />
        <input type="text" placeholder={ph.apellido} style={inputStyle} {...field("lastName", ph.apellido)} />
        <input type="email" placeholder={ph.email} style={inputStyle} {...field("email", ph.email)} />
        <input type="tel" placeholder={ph.phone} style={inputStyle} {...field("phone", ph.phone)} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginTop: 18,
          fontSize: 12,
          color: "#6b665d",
        }}
      >
        <span style={{ color: "#9A7B4F" }}>🔒</span> {t("paySecure")}
      </div>
    </div>
  );
}
