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
- **2026-07-20 (tarifas editables desde admin):** Nueva sección **`/admin/tarifas`**
  (link desde `/admin/reservas`) para editar precio por noche por unidad + tasa de
  limpieza + huéspedes incluidos + cargo huésped extra. Pensado para actualizar a
  mano cuando cambia la temporada (NO hay temporadas por rango de fechas).
  - **Supabase:** tabla `rate_settings` (fila única id=1, RLS sin policies, trigger
    `updated_at`) — el bloque SQL está al final de `supabase/setup.sql` y **hay que
    correrlo en el SQL Editor del dashboard** o el guardado del admin falla (el sitio
    público sigue andando con los defaults).
  - **Arquitectura:** `lib/reservation/rate-settings.ts` (tipos + defaults +
    validación + mappers, compartido) y `rate-settings.server.ts` (get/save, memo en
    módulo TTL 30s, **fail-safe**: cualquier error de DB → defaults de `lib/units.ts`,
    el sitio nunca rompe). Tras guardar, la server action invalida el memo y hace
    `revalidatePath` de tarifas/reservas/departamentos (los de departamentos son SSG).
  - **`extra_guest_fee` y `base_guests` se guardan pero NO se aplican al cálculo** —
    el precio sigue siendo tarifa plana por unidad (decisión del usuario; activarlo a
    futuro = sumar `(guests - baseGuests) * extraGuestFee` en los computeTotal).
  - Los precios públicos ya NO salen de las constantes: `/tarifas`, `/departamentos/*`
    y el wizard `/reservas` reciben `RateSettings` por props desde server components;
    `/api/payments` y `/api/reservations/transfer` los leen server-side al cobrar.
    `lib/units.ts` queda como fallback (UNITS/CLEANING_FEE/pricePerNight siguen ahí).
  - Tests: mocks de `rate-settings.server` en rates/payments/transfer route tests
    (siempre defaults); nuevo `tests/reservation/rate-settings.test.ts` (validación
    + mappers + defaults espejan lib/units).
- **2026-07-20 (pago de prueba):**
  - **`/admin/pago-prueba`** (+ endpoint `/api/admin/test-payment`, + link desde
    `/admin/reservas`): cobro REAL de **$1.000 ARS fijo en el server** con el mismo
    Payment Brick del checkout, para validar credenciales productivas de MP
    (tokenización + cobro + webhook firmado) SIN crear reserva (metadata
    `{test_payment:true}` sin `unit_id` → el webhook hace no-op) y SIN depender del
    modo WhatsApp (el 503 vive solo en `/api/payments`). Reembolso manual desde la
    actividad de MP. Spec: `docs/superpowers/specs/2026-07-20-admin-pago-prueba-design.md`.
    Flujo de lanzamiento: probar acá con credenciales `APP_USR-` → reembolsar →
    recién entonces quitar `NEXT_PUBLIC_BOOKING_MODE` y abrir el checkout.
- **2026-07-20 (social):** Links de redes en `Contacto.tsx` apuntaban a `#contacto`
  (placeholder). Ahora ambos íconos (Instagram y Facebook) llevan a
  `https://www.instagram.com/arumalodgeiguazu` — Facebook aún no existe.
  Nueva constante `INSTAGRAM_URL` en `lib/contact.ts`. Commit `ad06963` (pusheado).
- **2026-07-20 (más tarde):**
  - **Efectos REACTIVADOS** (`FX_DEFAULT = null`): el diagnóstico del freeze terminó
    **exonerando al sitio** — la escalera de canarios estáticos (`/canary.html`,
    `/canary-fotos.html`, `/canary-mapa.html`, `/canary-suma.html`, quedan deployados
    como kit de diagnóstico) probó que fotos/mapa/fuentes/HTML no congelan; la home
    real congelaba SOLO en el Chrome del usuario con su perfil (en Edge e incógnito
    carga perfecta) → **el gatillo era una extensión/estado del perfil de Chrome**
    (sospechosa nº1: React DevTools; quedó latente tras el ciclo deshabilitar/rehabilitar).
    Métricas del home medidas ese día: JS 235KB gz / 799KB parseado, fuentes ~99KB,
    fotos ~5MB, DOM 547 nodos — liviano. Si el freeze vuelve: incógnito → bisección
    de extensiones.
- **2026-07-20:**
  - **Efectos APAGADOS por defecto** (paliativo freeze): `FX_DEFAULT="css"` en
    `lib/fx.ts` → el `<html>` sale del servidor con `data-fx="css"` (quedan las
    transiciones CSS; lenis/trail/figuras/reveals/grano apagados). Para VER las
    animaciones: `?fx=on` en la URL. 🔁 Para REACTIVARLAS para el público:
    `FX_DEFAULT = null` en `lib/fx.ts` + test/tsc/build + push (instrucciones
    completas en `docs/superpowers/specs/2026-07-20-fx-default-off-design.md`).
    Motivo: freeze duro al cargar en máquinas sin GPU que ni el watchdog con
    deadman alcanzaba a salvar — bloqueaba las pruebas de Mercado Pago.
- **2026-07-19:**
  - **Galería de Cabaña Tatú** (`/departamentos/tatu`): pasa del layout fallback a la cuadrícula editorial asimétrica (`TATU_PHOTOS` en `UnitDetail.tsx`, mismo mecanismo que Yvyrá/Mberú) con las 11 fotos reales de `Casa/` del bucket (1–5, 7, 8, 13, 15, 18, 22). Dormitorios y baño van arriba en formato grande (cucheta `Casa/8` tall, baño `Casa/13` tall, dormitorio principal `Casa/15` wide) — antes quedaban chicos y mal rotulados. La disposición cierra pareja: 4×5 desktop, 2×10 mobile.
  - **OJO — el mapeo foto↔contenido de `Casa/` estaba mal** en `ImageSlot.tsx` (`REAL_PHOTOS`): `Casa/5` es el estar con sillones (no el dormitorio), `Casa/15` es el dormitorio principal (no la cocina), `Casa/7` es la cocina (no la cucheta), `Casa/8` es la cucheta (no amenities). Corregidos los seeds `cabana-tatu-*` (usan el layout fallback y cards). Verificado descargando y mirando las 11 fotos.
  - `PHOTO_TWEAKS` nuevos: `Casa/4` y `Casa/5` (living oscuro, brightness leve), `Casa/3` (position, vajillero a la izquierda), `Casa/22` (position 50% 30% — prioriza la cabaña sobre el agua en recortes cuadrados).
  - **Hero mobile**: textos alineados a la izquierda (`items-start text-left`, centrado solo desde `md`) — el H1 de 14ch llena el ancho mobile y el kicker/subtítulo centrados parecían desalineados. Subtítulo con `text-balance` + piso de fuente 16→18px: quiebra en 2 líneas parejas, sin viuda.
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
- Efectos visuales: default `null` (todo prendido) desde 2026-07-20 tarde; el kill-switch (`?sinfx=1` / `?fx=lista` / `FX_DEFAULT` en `lib/fx.ts`) queda como red de seguridad. Los 4 `/canary*.html` en `public/` son el kit de diagnóstico de freeze (ver entrada 2026-07-20).