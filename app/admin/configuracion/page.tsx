import { getSiteSettings } from "@/lib/site-settings.server";
import { hasBookingModeOverride } from "@/lib/booking-mode";
import { signOut } from "../login/actions";
import { ModeToggle } from "./ModeToggle";

export const metadata = { title: "Configuración — Panel Aruma" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  const settings = await getSiteSettings();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
          Configuración
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/admin/reservas" style={navLink}>Reservas</a>
          <a href="/admin/tarifas" style={navLink}>Tarifas</a>
          <form action={signOut}>
            <button type="submit" style={{ background: "transparent", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#6b665d" }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <ModeToggle current={settings.bookingMode} overridden={hasBookingModeOverride()} />
    </div>
  );
}

const navLink: React.CSSProperties = {
  fontSize: 13,
  color: "#6b665d",
  border: "1px solid #E7E0D4",
  borderRadius: 4,
  padding: "8px 14px",
  textDecoration: "none",
};
