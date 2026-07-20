import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { signOut } from "../login/actions";
import { RateForm } from "./RateForm";

export const metadata = { title: "Tarifas — Panel Aruma" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminTarifasPage() {
  const settings = await getRateSettings();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
          Tarifas
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/admin/reservas" style={{ fontSize: 13, color: "#6b665d", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", textDecoration: "none" }}>
            Reservas
          </a>
          <form action={signOut}>
            <button type="submit" style={{ background: "transparent", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#6b665d" }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <RateForm settings={settings} />
    </div>
  );
}
