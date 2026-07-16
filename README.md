# Aruma Lodge — Sitio corporativo

Sitio web institucional y de reservas para **Aruma Lodge**, departamentos turísticos de autor en Puerto Iguazú, Misiones.

Stack: **Next.js 16 App Router · TypeScript · Tailwind CSS v4 · next-intl (es/en/pt) · GSAP + Lenis · react-day-picker v10 · Vitest**

Especificaciones y plan de desarrollo en:
- Diseño/UX: [`../docs/superpowers/specs/2026-06-14-aruma-lodge-web-design.md`](../docs/superpowers/specs/2026-06-14-aruma-lodge-web-design.md)
- Plan de fases: [`../docs/superpowers/plans/2026-06-14-aruma-lodge-web.md`](../docs/superpowers/plans/2026-06-14-aruma-lodge-web.md)
- Upgrades de UI del home (responsive, motion, lightbox, SEO): [`../docs/superpowers/specs/2026-06-18-aruma-home-ui-upgrades-design.md`](../docs/superpowers/specs/2026-06-18-aruma-home-ui-upgrades-design.md) ✅ implementado

---

## Comandos

```bash
pnpm dev       # Servidor de desarrollo (http://localhost:3000)
pnpm build     # Build de producción
pnpm start     # Servidor de producción (requiere build previo)
pnpm test      # Suite de tests (Vitest, 157 tests)
pnpm lint      # ESLint
```

---

## Rutas generadas (18 páginas estáticas)

| Patrón | Locales |
|---|---|
| `/[locale]` | `/es` `/en` `/pt` |
| `/[locale]/departamentos/[slug]` | yvyra · mberu · tatu × 3 locales = 9 |
| `/[locale]/reservas` | `/es/reservas` `/en/reservas` `/pt/reservas` |
| `/[locale]/mi-reserva` | `/es/mi-reserva` `/en/mi-reserva` `/pt/mi-reserva` |

---

## Estructura del proyecto

```
aruma-web/
├── app/
│   ├── globals.css              # Tokens Tailwind v4 + overrides react-day-picker
│   ├── api/availability/[unitId]/route.ts   # Endpoint de disponibilidad (iCal → YYYY-MM-DD)
│   └── [locale]/
│       ├── layout.tsx           # Shell con fuentes + Lenis scroll
│       ├── page.tsx             # Home
│       ├── departamentos/[slug]/
│       ├── reservas/
│       ├── mi-reserva/          # Consulta de reserva (codigo + email, read-only)
│       └── tarifas/
├── components/
│   ├── ui/                      # Kicker, ButtonLink, ImageSlot (priority + Unsplash), LangSwitcher
│   ├── layout/                  # SiteNav (drawer móvil + scrollspy), SiteFooter, WhatsAppFab, FilmGrain
│   ├── motion/                  # LenisProvider, Reveal, Parallax, KenBurns, HeroReveal
│   ├── home/                    # Hero, SearchWidget, Manifiesto, UnitsGrid, Experiencias,
│   │                            #   GaleriaTeaser (client + lightbox), GalleryLightbox, CtaReserva,
│   │                            #   Contacto, ContactForm
│   ├── departamento/            # UnitDetail, StickyBookingCard
│   ├── reservas/                # ReservaFlow, Stepper, RangeCalendar, StepDatos,
│   │                            #   StepPago, OrderSummary, Confirmacion,
│   │                            #   LookupForm, ReservaEstado (consulta read-only)
│   └── tarifas/                 # UnitRateCard, InfoSections
├── lib/
│   ├── fonts.ts                 # next/font (Cormorant Garamond + Manrope)
│   ├── i18n/                    # Configuración next-intl + routing
│   ├── reservation/             # reducer · pricing · range · search · booking · validation
│   │                            #   availability(.server) · rates.server · calendar.server · payments(.server)
│   │                            #   lookup.server · status-view (consulta de reserva read-only)
│   ├── site.ts                  # Datos estáticos (distancias, condiciones, servicios)
│   └── units.ts                 # Definición de unidades (yvyra, mberu, tatu)
├── messages/
│   ├── es.json
│   ├── en.json
│   └── pt.json
└── tests/
    ├── i18n/                    # Paridad de claves entre locales
    └── reservation/             # reducer, pricing, availability
```

---

## Stubs pendientes — Fase 2

Los siguientes puntos están implementados como stubs funcionales en la UI pero requieren integración real antes del lanzamiento:

### Formulario de contacto (Home)
- **Archivo:** `components/home/ContactForm.tsx` (dentro de `components/home/Contacto.tsx`)
- **Estado actual:** muestra "Enviado ✓" localmente sin enviar nada.
- **Acción:** conectar a un endpoint real (email transaccional: Resend / SendGrid, o un form handler como Formspree).

### Reserva — agendado en Google Calendar — ✅ resuelto (escritura)

- **Implementación:** al confirmar, el flujo escribe el evento en el calendario de la unidad
  (bloquea las fechas, título `[PENDIENTE]`), genera un código real `ARM-AAAA-XXXX` y lo muestra.
- **Archivos:** `lib/reservation/calendar.server.ts` (auth service account + escritura),
  `lib/reservation/code.ts`, `app/api/reservations/route.ts` (POST, fail-closed),
  `lib/reservation/booking.ts` (cliente), `lib/reservation/validation.ts` (email compartido).
- **Config:** `GOOGLE_SERVICE_ACCOUNT_JSON` + `ARUMA_CAL_YVYRA/MBERU/TATU` en `.env.local`
  (ver `.env.example`). El service account debe tener permiso "Hacer cambios en los eventos"
  en los 3 calendarios.
- **Comportamiento:** fail-CLOSED (opuesto a la lectura) — re-chequeo de disponibilidad en
  tiempo real antes de escribir; ante conflicto responde 409, ante error de Calendar 502 y la
  UI NO muestra "confirmada".

### Pago en reservas — ✅ resuelto

- **Tarjeta (MercadoPago) ✅** — Checkout Bricks embebido, cobro en ARS, evento `[CONFIRMADA]` en
  Calendar sólo tras pago aprobado, webhook firmado (HMAC) idempotente. Rutas `app/api/payments` +
  `app/api/webhooks/mercadopago`. Modo test `PAYMENTS_MOCK=1`.
- **Transferencia + comprobante ✅** — segundo método en el paso Pago (selector tarjeta/transferencia).
  El huésped sube el comprobante → la reserva queda `[PENDIENTE]` y **bloquea las fechas** → se
  verifica desde el panel admin. Ruta `app/api/reservations/transfer` (fail-closed + reversión
  best-effort). Comprobante en Storage privado (`comprobantes`).
- **Persistencia (Supabase) ✅** — todas las reservas (tarjeta y transferencia) se registran en la
  tabla `public.reservations` (verdad del estado). Calendar sigue siendo la verdad de disponibilidad.

### Panel admin — ✅ resuelto (`/admin/reservas`)

- **Login con Supabase Auth** (`@supabase/ssr`, sesión en cookies); sólo entran emails de la allowlist
  `ADMIN_EMAILS`. Middleware protege `/admin/*` y `/api/admin/*`; `/admin/login` es público.
- **Acceso discreto:** el `©` del footer linkea a `/admin/login`.
- **Listado** filtrable (pendientes/confirmadas/liberadas/todas) con comprobante (signed URL) y
  referencia (código + pago MP). Acciones **Confirmar** / **Liberar** sobre transferencias pendientes
  (`app/api/admin/reservations/[id]`): confirmar pasa el evento a `[CONFIRMADA]`; liberar lo borra
  (libera fechas).
- **Config (`.env.local`, ver `.env.example`):** `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secreto, sólo server),
  `NEXT_PUBLIC_ARUMA_BANK_ALIAS/CBU/HOLDER` (datos de transferencia), `ADMIN_EMAILS`.

### Consulta de reserva del huésped (subsistema C) — ✅ resuelto (`/mi-reserva`)

- **Read-only:** el huésped ingresa **código + email** y ve el estado de su reserva
  (vista saneada: unidad, fechas, noches, huéspedes, total, método, estado). Cancelar/modificar
  siguen por WhatsApp (CTA prellenado con el código) o por el panel admin.
- **Identidad:** sin cuentas; match `code` + `email` (normalizado). Respuesta `404` **genérica e
  idéntica** para "no existe" y "email no coincide" (anti-enumeración). Rate-limit best-effort por IP.
- **Archivos:** `lib/reservation/lookup.server.ts` (consulta saneada), `lib/reservation/status-view.ts`
  (mapeo de estado), `app/api/reservations/lookup/route.ts` (POST), `components/reservas/LookupForm.tsx`
  + `ReservaEstado.tsx`, `app/[locale]/mi-reserva/page.tsx`.
- **Fuente de verdad:** la tabla `public.reservations` (no se toca Google Calendar).

### Email de confirmación (subsistema D) — ✅ resuelto

Un único email transaccional de "Reserva confirmada", en el idioma en que el huésped
reservó (es/en/pt), enviado **exactamente una vez** cuando la reserva pasa a `confirmed`:

- Tarjeta aprobada (sincrónico en `/api/payments` y/o webhook de MercadoPago).
- Transferencia aprobada por el admin (`/api/admin/reservations/[id]` → confirm).

**Exactly-once:** `confirmation_email_sent_at` se marca con un UPDATE condicional atómico
(`markConfirmationEmailSent`); solo el llamado que gana el flip envía. **Fail-soft:** un fallo de
Resend nunca rompe la confirmación de la reserva. El locale se persiste en `reservations.locale`.

**Archivos:** `lib/reservation/email.server.ts` (envío vía Resend), `lib/reservation/email-template.ts`
(asunto/HTML/texto en es/en/pt), `lib/reservation/reservations.server.ts` (`markConfirmationEmailSent`),
llamado desde `app/api/payments/route.ts`, `app/api/webhooks/mercadopago/route.ts` y
`app/api/admin/reservations/[id]/route.ts`.

**Config:** `RESEND_API_KEY` y `ARUMA_EMAIL_FROM` (ver `.env.example`).
**Pendiente de lanzamiento:** verificar el dominio del remitente en Resend; hasta entonces se usa
`onboarding@resend.dev` (solo entrega a la cuenta dueña de Resend).

### Disponibilidad (`getAvailability`) — ✅ resuelto

- **Implementación:** lee los calendarios de Google vía iCal secret URL (una por unidad).
- **Archivos:** `lib/reservation/ics.ts` (parser), `lib/reservation/availability.server.ts`
  (fetch + parse), `app/api/availability/[unitId]/route.ts` (endpoint),
  `lib/reservation/availability.ts` (wrapper cliente).
- **Config:** definir `ARUMA_ICS_YVYRA`, `ARUMA_ICS_MBERU`, `ARUMA_ICS_TATU` en `.env.local`
  (ver `.env.example`). En Google Calendar: Configuración del calendario > "Dirección secreta en formato iCal".
- **Comportamiento:** fail-open — ante env faltante o error de red devuelve disponibilidad
  total (`source: "stub"`) y loguea server-side; en operación normal `source: "google-calendar"`.
  Las fechas viajan como `YYYY-MM-DD` (sin corrimiento de zona horaria).
- **Limitación conocida:** los eventos con hora usan la porción de fecha sin convertir TZ
  (las reservas reales son eventos all-day, donde no aplica). Ver JSDoc en `ics.ts`.

### Fotos reales
- **Componente:** `components/ui/ImageSlot.tsx`
- **Estado actual:** placeholders con fotos de banco **Unsplash curadas por label** (selva/lodge/cataratas/departamentos), vía `PHOTO_MAP`. Fallback a `picsum` para labels no curados. Prop `priority` para el hero (LCP eager + `fetchPriority=high`).
- **Acción:** reemplazar por `<Image>` de Next.js con las fotos reales del lodge (con `priority` en el hero).

### Logo real
- **Componente:** `components/layout/SiteNav.tsx` (y `SiteFooter.tsx`)
- **Estado actual:** wordmark tipográfico "ARUMA".
- **Acción:** reemplazar por `<Image>` con el archivo SVG/PNG del logo definitivo.

### Datos de contacto reales
- **Archivos:** `components/layout/SiteFooter.tsx`, `components/layout/WhatsAppFab.tsx`, `components/home/Contacto.tsx`, `components/home/CtaReserva.tsx`
- **Datos:** centralizados en `lib/contact.ts` (`WHATSAPP_NUMBER`, `CONTACT_EMAIL`, `CONTACT_PHONE_HREF`, `waLink`).
  - WhatsApp: `5493757652002` (+54 9 3757 652002)
  - Email: `arumalodge.iguazu@gmail.com`

### Traducciones EN/PT
- **Archivos:** `messages/en.json`, `messages/pt.json`
- **Estado actual:** traducciones funcionales pero generadas automáticamente.
- **Acción:** revisión por hablante nativo antes de publicar.

### Contenido por unidad
- **Archivo:** `lib/units.ts` y `messages/[locale].json` (clave `departamento`)
- **Estado actual:** descripción y características parcialmente genéricas / compartidas entre unidades.
- **Acción:** enriquecer el copy de cada unidad (Yvyrá, Mberú, Tatú) con texto específico que refleje sus diferencias reales.

---

## Tokens de diseño

Los colores, tipografías y radios del handoff están definidos como custom properties de Tailwind v4 en `app/globals.css`:

```css
--color-terracota: #a04b2a
--color-selva: #23362b
--color-marfil: #f8f5f0
--color-bronce: #9a7b4f
--font-display: 'Cormorant Garamond', serif
--font-sans: 'Manrope', system-ui, sans-serif
```

---

## Tests

```
25 suites · 157 tests
  tests/i18n/messages.test.ts                    (3)  paridad de claves es/en/pt
  tests/reservation/reducer.test.ts              (7)  flujo de reserva + datos del huesped
  tests/reservation/pricing.test.ts              (5)  calculo de noches, subtotal y total
  tests/reservation/range.test.ts                (4)  utilidades de rango de fechas
  tests/reservation/search.test.ts               (7)  parseo/normalizacion de busqueda
  tests/reservation/ics.test.ts                  (11) parser iCal (noches, turnover, folding)
  tests/reservation/availability.server.test.ts  (10) lectura: env + fetch + route + fail-open
  tests/reservation/availability.test.ts         (5)  wrapper cliente disponibilidad (TZ-safe)
  tests/reservation/rates.server.test.ts         (4)  tarifas por unidad
  tests/reservation/code.test.ts                 (5)  generador de codigo ARM-AAAA-XXXX
  tests/reservation/calendar.server.test.ts      (12) escritura: auth + isRangeAvailable + insert
  tests/reservation/calendar-pending.test.ts     (3)  estado [PENDIENTE] en Calendar
  tests/reservation/booking.test.ts              (4)  cliente createReservation + formatDateOnly
  tests/reservation/payments.server.test.ts      (7)  integracion MercadoPago (server)
  tests/reservation/payments-route.test.ts       (15) route POST /api/payments (fail-closed + webhook)
  tests/reservation/webhook-route.test.ts        (6)  webhook MercadoPago (HMAC + idempotencia)
  tests/reservation/comprobante-server.test.ts   (5)  subida de comprobante a Storage privado
  tests/reservation/transfer-client.test.ts      (4)  cliente createTransferReservation
  tests/reservation/transfer-route.test.ts       (9)  route POST /api/reservations/transfer (fail-closed + reversion)
  tests/reservation/reservations-server.test.ts  (4)  persistencia Supabase (public.reservations)
  tests/reservation/status-view.test.ts          (4)  mapeo de estado -> clave UI (resolveStatusKey)
  tests/reservation/lookup-server.test.ts        (6)  consulta saneada por codigo + email (findReservationForGuest)
  tests/reservation/lookup-route.test.ts         (8)  route POST /api/reservations/lookup (404 generico + rate-limit + 503 fail-safe)
  tests/admin/auth.test.ts                       (4)  login/allowlist Supabase Auth
  tests/admin/actions.test.ts                    (5)  acciones confirmar/liberar del panel admin
```
