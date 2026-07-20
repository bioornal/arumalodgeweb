import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin/auth";
import { TestPaymentBrick } from "./TestPaymentBrick";

// Pago de PRUEBA de la integración productiva de MP ($1000, reembolsable).
// El middleware ya protege /admin/*; re-verificamos por defensa en profundidad
// y de paso obtenemos el email del admin para precargar el Brick.
export default async function PagoPruebaPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
          Pago de prueba
        </h1>
        <a href="/admin/reservas" style={{ fontSize: 13, color: "#6b665d" }}>← Reservas</a>
      </div>

      <div style={{ padding: "14px 16px", borderRadius: 6, background: "#fef6e7",
        border: "1px solid #e9d6a8", color: "#7a5a18", fontSize: 13, marginBottom: 8 }}>
        Este pago es <strong>REAL</strong>: cobra <strong>$1.000 ARS</strong> con las credenciales
        productivas para validar la integración (tokenización + cobro + webhook).
        No genera ninguna reserva ni toca el calendario.
      </div>
      <p style={{ fontSize: 13, color: "#6b665d", margin: "0 0 24px" }}>
        Después de probar, reembolsalo desde la{" "}
        <a href="https://www.mercadopago.com.ar/activities" target="_blank" rel="noreferrer">
          actividad de Mercado Pago
        </a>{" "}
        (el cargo aparece como ARUMALODGE).
      </p>

      <TestPaymentBrick adminEmail={admin.email} />
    </div>
  );
}
