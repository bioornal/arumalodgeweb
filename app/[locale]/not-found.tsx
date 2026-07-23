import Link from "next/link";

// 404 del segmento [locale]. Server component: no recibe el locale por params
// (Next no se lo pasa a not-found), así que los textos van en castellano.
export default function LocaleNotFound() {
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
        Error 404
      </p>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontWeight: 400, fontSize: "clamp(28px,4vw,42px)", margin: 0, color: "#1D1D1D" }}>
        Esta página no existe
      </h1>
      <p style={{ fontSize: 15, color: "#6b665d", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
        Puede que el enlace esté viejo o mal escrito. Te dejamos el camino de vuelta.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/es" style={btnPrimary}>Volver al inicio</Link>
        <Link href="/es/tarifas" style={btnSecondary}>Ver tarifas</Link>
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
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  textDecoration: "none",
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
