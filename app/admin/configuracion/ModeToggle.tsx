"use client";

import { useActionState } from "react";
import { saveBookingMode } from "./actions";
import type { BookingMode } from "@/lib/site-settings";

export function ModeToggle({
  current,
  overridden,
}: {
  current: BookingMode;
  overridden: boolean;
}) {
  const [state, action, pending] = useActionState(saveBookingMode, undefined);
  const isOnline = current === "online";
  const next: BookingMode = isOnline ? "whatsapp" : "online";

  return (
    <div style={card}>
      <h2 style={h2}>Modo de reserva</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isOnline ? "#3f8f5f" : "#b0741d",
          }}
        />
        <strong style={{ fontSize: 17 }}>
          {isOnline ? "Reserva online ABIERTA" : "Reserva online PAUSADA"}
        </strong>
      </div>

      <p style={hint}>
        {isOnline
          ? "Los huéspedes pueden reservar y pagar desde el sitio, con tarjeta o transferencia."
          : "Los botones de reservar derivan a WhatsApp con las fechas prellenadas, /reservas redirige a tarifas y los pagos están bloqueados. El sitio sigue mostrando precios y disponibilidad."}
      </p>

      {overridden && (
        <p role="alert" style={{ ...hint, color: "#8a3b1d", fontWeight: 500 }}>
          ⚠ La variable de entorno NEXT_PUBLIC_BOOKING_MODE está seteada en Netlify y le
          gana a esta configuración. Mientras siga puesta, este botón no cambia nada de
          cara al público: hay que borrarla en Netlify y redeployar.
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="booking_mode" value={next} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (next === "online" && !confirm(
              "Vas a ABRIR el cobro online. Los huéspedes van a poder pagar con tarjeta y transferencia.\n\n¿Verificaste que los datos bancarios y las credenciales de Mercado Pago estén bien?"
            )) {
              e.preventDefault();
            }
          }}
          style={{
            padding: "13px 30px",
            background: pending ? "#8a8170" : next === "online" ? "#23362B" : "#8a3b1d",
            color: "#F8F5F0",
            border: "none",
            borderRadius: 3,
            cursor: pending ? "default" : "pointer",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          {pending
            ? "Guardando…"
            : next === "online"
              ? "Abrir reserva online"
              : "Pausar reserva online"}
        </button>
      </form>

      {state?.ok && (
        <p style={{ fontSize: 13, color: "#3f8f5f", marginTop: 14 }}>
          Guardado. Recargá esta página para ver el estado nuevo.
        </p>
      )}
      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "#8a3b1d", marginTop: 14 }}>
          {state.error}
        </p>
      )}
    </div>
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
  margin: 0,
};

const hint: React.CSSProperties = {
  fontSize: 12.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};
