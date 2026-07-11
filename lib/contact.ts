// Datos de contacto reales del lodge — único lugar donde viven.
// WhatsApp: +54 9 3757 419667 · Email: arumalodge.iguazu@gmail.com

export const WHATSAPP_NUMBER = "5493757419667";
export const CONTACT_EMAIL = "arumalodge.iguazu@gmail.com";
export const CONTACT_PHONE_HREF = "tel:+5493757419667";

/** Link a WhatsApp, opcionalmente con mensaje prellenado. */
export function waLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
