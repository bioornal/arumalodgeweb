"use client";

import { useEffect } from "react";

// Error boundary del segmento [locale]. Sin esto, un throw en cualquier página
// pública muestra la pantalla cruda de Next, sin marca ni salida para el usuario.
// Es un client component por obligación de Next, así que no puede usar
// next-intl server-side: los textos van en castellano, el idioma por defecto.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4EFE7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#8a8170", margin: 0 }}>
        Aruma Lodge
      </p>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontWeight: 400, fontSize: "clamp(28px,4vw,42px)", margin: 0, color: "#1D1D1D" }}>
        Algo se nos rompió
      </h1>
      <p style={{ fontSize: 15, color: "#6b665d", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
        Tuvimos un problema cargando esta página. Podés reintentar, o escribirnos por
        WhatsApp y lo resolvemos al toque.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={reset} style={btnPrimary}>Reintentar</button>
        <a href="https://wa.me/5493757652002" style={btnSecondary}>Escribinos por WhatsApp</a>
      </div>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "13px 28px",
  background: "#23362B",
  color: "#F8F5F0",
  border: "none",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
};

const btnSecondary: React.CSSProperties = {
  padding: "13px 28px",
  background: "transparent",
  color: "#23362B",
  border: "1px solid #23362B",
  borderRadius: 3,
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  textDecoration: "none",
};
