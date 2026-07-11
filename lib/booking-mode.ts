// Modo de reservas del sitio.
// NEXT_PUBLIC_BOOKING_MODE=whatsapp → la reserva online está pausada y todos los
// CTAs derivan a WhatsApp (vidriera completa: disponibilidad y precios siguen).
// Ausente u otro valor → checkout online normal. La variable se inlinea en el
// build: cambiarla requiere redeploy.

export function isWhatsAppBookingMode(): boolean {
  return process.env.NEXT_PUBLIC_BOOKING_MODE === "whatsapp";
}
