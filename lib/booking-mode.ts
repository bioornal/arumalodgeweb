import { isBookingMode, type BookingMode } from "@/lib/site-settings";

export type { BookingMode };

// Modo de reserva del sitio.
//
// La fuente de verdad es la tabla site_settings en Supabase, editable desde
// /admin/configuracion sin redeploy (ver lib/site-settings.server.ts).
//
// NEXT_PUBLIC_BOOKING_MODE sobrevive como KILL-SWITCH DE EMERGENCIA y le gana a
// la DB: si Supabase se rompe o queda en un estado inesperado, se setea la env
// var en Netlify y se fuerza el modo sin depender de la base. Mismo patrón que
// ?fx= ganándole al flag de localStorage en lib/fx.ts.
//
// La variable se inlinea en el build: cambiarla sigue requiriendo redeploy. Por
// eso es la salida de emergencia, no el control de todos los días.

/** El modo efectivo: el de la DB, salvo que la env var lo esté forzando. */
export function resolveBookingMode(dbMode: BookingMode): BookingMode {
  const override = process.env.NEXT_PUBLIC_BOOKING_MODE;
  return isBookingMode(override) ? override : dbMode;
}

/** true = reserva online pausada, los CTAs derivan a WhatsApp. */
export function isWhatsAppBookingMode(mode: BookingMode): boolean {
  return mode === "whatsapp";
}

/** true si la env var está forzando el modo (el panel lo avisa). */
export function hasBookingModeOverride(): boolean {
  return isBookingMode(process.env.NEXT_PUBLIC_BOOKING_MODE);
}
