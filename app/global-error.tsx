"use client";

// Red final: se usa solo si falla el layout raíz, cuando ni el error boundary
// de [locale] llega a montarse. Reemplaza el documento completo, por eso lleva
// sus propios <html> y <body> y estilos inline sin depender de globals.css.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F4EFE7", color: "#1D1D1D" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontWeight: 400, fontSize: 32, margin: 0 }}>Aruma Lodge</h1>
          <p style={{ fontSize: 15, color: "#6b665d", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
            El sitio no está disponible en este momento. Si necesitás reservar, escribinos
            por WhatsApp al +54 9 3757 652002.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "13px 28px",
              background: "#23362B",
              color: "#F8F5F0",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
