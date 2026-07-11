"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f5f0", fontFamily: "'Manrope', sans-serif" }}>
      <form action={action} style={{ width: 320, background: "#fff", border: "1px solid #E7E0D4", borderRadius: 8, padding: 32 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 26, margin: "0 0 20px" }}>
          Panel Aruma
        </h1>
        <input name="email" type="email" placeholder="Email" required
          style={{ width: "100%", padding: "11px 12px", marginBottom: 12, border: "1px solid #E7E0D4", borderRadius: 4, fontSize: 14 }} />
        <input name="password" type="password" placeholder="Contraseña" required
          style={{ width: "100%", padding: "11px 12px", marginBottom: 16, border: "1px solid #E7E0D4", borderRadius: 4, fontSize: 14 }} />
        <button type="submit" disabled={pending}
          style={{ width: "100%", padding: "12px", background: "#23362B", color: "#F8F5F0", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" }}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
        {state?.error && <p style={{ color: "#8a3b1d", fontSize: 13, marginTop: 12 }}>{state.error}</p>}
      </form>
    </div>
  );
}
