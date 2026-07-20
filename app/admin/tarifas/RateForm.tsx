"use client";

import { useActionState } from "react";
import { saveRates } from "./actions";
import type { RateSettings } from "@/lib/reservation/rate-settings";
import { UNITS } from "@/lib/units";

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6b665d",
  marginBottom: 6,
  letterSpacing: ".04em",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #E7E0D4",
  borderRadius: 4,
  fontSize: 14,
  background: "#fff",
};

export function RateForm({ settings }: { settings: RateSettings }) {
  const [state, action, pending] = useActionState(saveRates, undefined);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Precio por noche por unidad */}
      <section style={card}>
        <h2 style={h2}>Precio por noche</h2>
        <p style={hint}>
          Tarifa plana por unidad, sin importar la cantidad de huéspedes. Cuando cambia la
          temporada, actualizá estos valores.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {UNITS.map((u) => (
            <div key={u.slug}>
              <label htmlFor={`nightly_${u.slug}`} style={label}>
                {u.name} (hasta {u.specs.guests} huésp.)
              </label>
              <input
                id={`nightly_${u.slug}`}
                name={`nightly_${u.slug}`}
                type="number"
                min={1}
                step={1}
                required
                defaultValue={settings.nightly[u.slug]}
                style={input}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Tasas */}
      <section style={card}>
        <h2 style={h2}>Tasas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <label htmlFor="cleaning_fee" style={label}>
              Limpieza (por estadía)
            </label>
            <input
              id="cleaning_fee"
              name="cleaning_fee"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={settings.cleaningFee}
              style={input}
            />
          </div>
          <div>
            <label htmlFor="base_guests" style={label}>
              Huéspedes incluidos
            </label>
            <input
              id="base_guests"
              name="base_guests"
              type="number"
              min={1}
              max={20}
              step={1}
              required
              defaultValue={settings.baseGuests}
              style={input}
            />
          </div>
          <div>
            <label htmlFor="extra_guest_fee" style={label}>
              Huésped extra
            </label>
            <input
              id="extra_guest_fee"
              name="extra_guest_fee"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={settings.extraGuestFee}
              style={input}
            />
          </div>
        </div>
        <p style={hint}>
          El cargo por huésped extra se guarda pero todavía no se aplica al cálculo: hoy el
          precio es tarifa plana por unidad. Queda listo para activarlo a futuro.
        </p>
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "13px 30px",
            background: pending ? "#8a8170" : "#23362B",
            color: "#F8F5F0",
            border: "none",
            borderRadius: 3,
            cursor: pending ? "default" : "pointer",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          {pending ? "Guardando…" : "Guardar tarifas"}
        </button>
        {state?.ok && (
          <span style={{ fontSize: 13, color: "#3f8f5f" }}>
            Guardado. Los precios públicos ya reflejan el cambio.
          </span>
        )}
        {state?.error && (
          <span role="alert" style={{ fontSize: 13, color: "#8a3b1d" }}>
            {state.error}
          </span>
        )}
      </div>

      <p style={{ ...hint, margin: 0 }}>
        Impacta de inmediato en las tarifas públicas y en las reservas nuevas. Las reservas
        ya creadas conservan el total con el que se hicieron.
      </p>
    </form>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E7E0D4",
  borderRadius: 8,
  padding: 24,
};

const h2: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontWeight: 500,
  fontSize: 22,
  margin: "0 0 8px",
};

const hint: React.CSSProperties = {
  fontSize: 12.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};
