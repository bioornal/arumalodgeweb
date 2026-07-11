# Aruma Lodge — Memoria del proyecto

## Stack
- Next.js 16 App Router · TypeScript · Tailwind v4 · next-intl (es/en/pt) · GSAP + Lenis · react-day-picker v10 · Vitest
- Backend: Supabase, Mercado Pago (MP)
- Deploy: Netlify (CLI no instalada aún globalmente; `netlify.toml` usa `node ./node_modules/next/dist/bin/next build`)

## Estado del deploy
- **Pendiente:** deploy a Netlify con `netlify deploy --prod --dir=aruma-web` (o desde dentro de `aruma-web`).
- Netlify CLI no está instalada. Instalar con `npm install -g netlify-cli` antes de deployar.
- `.env.local` tiene `NEXT_PUBLIC_BOOKING_MODE=whatsapp` (reserva online pausada, CTAs derivan a WhatsApp).

## Cambios recientes
- **2026-07-11:** Cambio de número de WhatsApp/teléfono de `5493548403786` (+54 9 3548 40-3786) a `5493757419667` (+54 9 3757 419667).
  - Commit local: `8d944c2` (sin push — el usuario no quiere usar GitHub).
  - Archivos editados:
    1. `lib/contact.ts` — fuente de verdad (`WHATSAPP_NUMBER`, `CONTACT_PHONE_HREF`, comentario). Propaga a `WhatsAppFab`, `StickyBookingCard`, `UnitRateCard`, `CtaReserva`.
    2. `components/home/Contacto.tsx:144` — display string hardcodeado.
    3. `app/[locale]/page.tsx:29` — JSON-LD `telephone`.
    4. `tests/booking-mode.test.ts:40` — aserción del número.
    5. `README.md` — datos de contacto.
    6. `docs/superpowers/specs/2026-07-10-modo-reservas-whatsapp-design.md` — spec.
  - Tests `booking-mode` pasan (5/5).

## Datos de contacto del lodge
- WhatsApp: +54 9 3757 419667 (`wa.me/5493757419667`)
- Email: arumalodge.iguazu@gmail.com
- Centralizados en `lib/contact.ts`.

## Notas
- El repo tiene muchos archivos modificados no relacionados (cambios de UI previos sin commitear). Al deployar, solo se commiteó lo del cambio de número.
- Modo WhatsApp activo: los CTAs de reserva derivan a WhatsApp con mensaje prellenado; `/reservas` redirige a `/tarifas`; los APIs de pago responden 503.