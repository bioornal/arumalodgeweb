# Aruma Lodge — Memoria del proyecto

## Stack
- Next.js 16 App Router · TypeScript · Tailwind v4 · next-intl (es/en/pt) · GSAP + Lenis · react-day-picker v10 · Vitest
- Backend: Supabase, Mercado Pago (MP)
- Deploy: Netlify (CLI no instalada aún globalmente; `netlify.toml` usa `node ./node_modules/next/dist/bin/next build`)

## Estado del deploy
- **Deploy continuo desde GitHub (2026-07-11):** repo `github.com/bioornal/arumalodgeweb` (branch `main`).
  - El repo git vive en `aruma-web/` (repo propio e independiente; **NO** usar el repo viejo con raíz en `C:\Users\spezi` HOME — subiría secretos del home).
  - Cada `git push` a `main` dispara build+deploy en Netlify (una vez conectado el repo en el dashboard).
  - Config de build en `netlify.toml` (base = raíz del repo, sin subcarpeta).
- `.env.local` NO se sube (gitignored). Las env vars viven en Netlify (site settings) — cerca del límite de 4KB.
- `.env.local` tiene `NEXT_PUBLIC_BOOKING_MODE=whatsapp` (reserva online pausada, CTAs derivan a WhatsApp).

## Cambios recientes
- **2026-07-18:**
  - **Auto-degradado de efectos** (`FxWatchdog` en el layout): mide FPS reales al cargar (600ms de warmup + 1.8s de muestreo); si el promedio queda bajo 24fps — o si la muestra no terminó a los 4s (deadman: rAF muerto por freeze duro del compositor) — degrada EN VIVO sin recargar (`data-fx=""` apaga grano + CSS al instante; el evento `aruma:fx-degrade` destruye Lenis) y graba `aruma-fx-off` en localStorage (TTL 24h) para que las cargas siguientes nazcan livianas vía el script inline del layout (mismo mecanismo de `?sinfx=1`). OJO: la primera versión del watchdog hacía `location.reload()` al degradar — una segunda carga completa sobre una máquina ya ahogada, que convertía el tirón en freeze duro; no reintroducir. La URL siempre le gana al flag. Contexto: el freeze en máquinas sin aceleración de GPU persistía de forma intermitente incluso después de redimensionar las fotos del bucket (los originales de 8–12MP se bajaron a 1920px máx, ~62% menos RAM de decodificación).
  - `Experiencias` rediseñada como banda cinematográfica full-bleed: la foto real `Iguazu_Cataratas2.jpg` (única del destino en el bucket) es la protagonista en su formato panorámico con parallax + caption (`experiencias.caption` en messages); los 4 ítems van en una tira editorial debajo, sin imágenes propias. Se descartó la lista interactiva con crossfade (y las fotos interim de Unsplash) para no competir con la foto real.
  - `RelatoImagenes`: PHOTOS reordenado al orden visual de la grilla → numeración 01–10 correlativa y consistente con el contador del lightbox.
  - `SiteNav`: fondo `bg-marfil` fijo siempre (se eliminó el estado translúcido inicial y el listener de scroll).
- **2026-07-16:** Corrección de número de WhatsApp/teléfono de `5493757419667` (+54 9 3757 419667) a `5493757652002` (+54 9 3757 652002). Mismos archivos que el cambio del 2026-07-11.
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
- WhatsApp: +54 9 3757 652002 (`wa.me/5493757652002`)
- Email: arumalodge.iguazu@gmail.com
- Centralizados en `lib/contact.ts`.

## Notas
- El repo tiene muchos archivos modificados no relacionados (cambios de UI previos sin commitear). Al deployar, solo se commiteó lo del cambio de número.
- Modo WhatsApp activo: los CTAs de reserva derivan a WhatsApp con mensaje prellenado; `/reservas` redirige a `/tarifas`; los APIs de pago responden 503.