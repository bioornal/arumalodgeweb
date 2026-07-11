# Modo "Reservas por WhatsApp" (temporal, reversible) — Diseño

**Fecha:** 2026-07-10 · **Estado:** aprobado por el usuario (conversación)

## Contexto

El sitio debe mostrarse YA a huéspedes que llegan este mes, pero el cobro online con
Mercado Pago todavía no está habilitado para producción. Se pausa la reserva online
de forma profesional: el sitio queda como vidriera completa (fotos, disponibilidad
real, precios) y toda reserva se deriva a WhatsApp con mensaje prellenado. Sin
carteles de "en construcción": los CTAs cambian a "Reservar por WhatsApp" y una
línea cálida comunica el canal.

## Decisiones

1. **Interruptor:** `NEXT_PUBLIC_BOOKING_MODE=whatsapp` activa el modo. Ausente o
   cualquier otro valor = modo online normal. Volver atrás = cambiar env en Netlify
   y redeployar (la variable se inlinea en el build).
2. **Vidriera completa:** buscador del hero, `/tarifas` con disponibilidad real
   (iCal) y precios siguen intactos.
3. **Contacto real centralizado (permanente):** módulo `lib/contact.ts` con
   WhatsApp `5493757419667` (+54 9 3757 419667) y email
   `arumalodge.iguazu@gmail.com`. Reemplaza los placeholders
   `5493757000000` y `hola@arumalodge.com` en todo el sitio.

## Componentes

- **`lib/contact.ts` (nuevo):** `WHATSAPP_NUMBER`, `CONTACT_EMAIL`,
  `CONTACT_PHONE_HREF`, `waLink(message?)` → `https://wa.me/<nro>?text=<msg>`.
- **`lib/booking-mode.ts` (nuevo):** `isWhatsAppBookingMode()`.
- **`UnitRateCard` (tarifas):** en modo WhatsApp, si la unidad está disponible el
  CTA es `<a>` a `waLink("Hola! Quiero reservar {unidad} del {fecha} al {fecha}
  para {n} huéspedes.")` con label "Reservar por WhatsApp" + nota "Confirmamos tu
  reserva al instante por WhatsApp" (i18n es/en/pt). Sin fechas o sin
  disponibilidad: igual que hoy.
- **`StickyBookingCard` (página de unidad):** CTA primario pasa a WhatsApp con
  mensaje prellenado con la unidad. El link secundario de WhatsApp usa el número real.
- **`/[locale]/reservas`:** `redirect()` server-side a `/{locale}/tarifas`
  preservando el query string. Los deep-links viejos no rompen.
- **`/api/payments`:** corta con `503 {"error":"bookings_paused"}` si el modo está
  activo (defensa en profundidad).
- **Placeholders reemplazados:** `WhatsAppFab`, `Contacto` (wa + tel + mailto),
  `CtaReserva` (wa + el botón "Reservar" apunta a `/tarifas` en modo WhatsApp),
  `SiteFooter` (mailto), JSON-LD de `page.tsx` (email), `ReservaEstado` (número).
- **No se toca:** `/mi-reserva`, `/admin`, disponibilidad, FAB (solo número).

## Testing

- Unit: `waLink` (con/sin mensaje, encoding), `isWhatsAppBookingMode`.
- Componentes: `UnitRateCard` renderiza CTA WhatsApp en modo whatsapp y checkout
  normal sin la env (mock de env var).
- Suite completa + tsc + build antes de deploy.

## Deploy

Commit de todo el trabajo pendiente → `netlify env:set NEXT_PUBLIC_BOOKING_MODE
whatsapp` → build + deploy prod con Netlify CLI → verificación en vivo.
