# Camino a producción — 5 etapas

**Fecha:** 2026-07-23
**Estado:** diseño aprobado, pendiente de plan de implementación

## Problema

El sitio está LIVE en `aruma-lodge.netlify.app` en modo WhatsApp (reserva online
pausada). Una auditoría del repo encontró que **el build no compila hoy** y que
faltan piezas para abrir el cobro online. Este documento define las etapas para
llegar a producción, cada una cerrando con commit + push a `main` (deploy
continuo).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Ramas / push | Push directo a `main` por etapa. El checkout está cerrado, el riesgo es bajo, y permite verificar cada etapa en producción real antes de seguir. |
| Granularidad del toggle | Binario: `whatsapp` ↔ `online`. Replica exactamente el comportamiento actual. Extensible después sin romper nada. |
| Legales | Política de cancelación/reembolso + aviso de privacidad. Términos generales queda fuera de alcance. |
| Analytics | Google Analytics 4 (el dueño crea la propiedad y provee el Measurement ID). |
| Dominio | Sin dominio propio por ahora. Todo el SEO lee `NEXT_PUBLIC_SITE_URL` en vez de hardcodear, para que conectar un dominio sea cambiar una env var. |
| Emails | **Bloque diferido.** Ver "Bloque C diferido" al final. |

## Estado de partida (verificado 2026-07-23)

- Rama `main`, **3 commits sin pushear** + 7 archivos sin commitear.
- `npx tsc --noEmit` **falla** en `app/admin/tarifas/actions.ts:22`.
- `pnpm test`: **236/237** — falla `tests/reservation/payments-route.test.ts`.
- Los 7 archivos sin commitear (`components/reservas/*`, 2 rutas de API)
  implementan el desglose por método de pago y la línea de ahorro por
  transferencia. Están **completos y coherentes**: la clave i18n `transferSaves`
  existe en `es`, `en` y `pt`. Lo único que le falta a esa feature es el form del
  admin y la aserción del test.

---

## Arquitectura del toggle de modo de reserva

### El problema con el diseño actual

`NEXT_PUBLIC_BOOKING_MODE` se **inlinea en el build**, así que cambiar de modo
exige un redeploy completo. El objetivo es que sea un click en el panel.

### Alternativas consideradas

1. **Columna nueva en `rate_settings`** — reusa la tabla existente con su memo y
   su fail-safe; cero queries extra. Descartada: mete configuración operativa en
   una tabla de precios, y esconde el switch de "cerrar reservas" bajo
   `/admin/tarifas`.
2. **Tabla `site_settings` propia** ← **elegida**. Límites limpios, lugar propio
   en el panel, extensible. Cuesta una query extra en 4 páginas, cacheada 30s.
3. **Env var de Netlify vía su API** — descartada: cada click son ~2 min de
   build, requiere un token de Netlify en el server, y si el build falla el sitio
   queda en el estado viejo sin avisar.

### Componentes

**`site_settings` (Supabase)**

```sql
create table if not exists public.site_settings (
  id           smallint primary key default 1 check (id = 1),
  booking_mode text not null default 'whatsapp'
               check (booking_mode in ('whatsapp', 'online')),
  updated_at   timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();
```

RLS activado sin policies — mismo criterio que `reservations` y `rate_settings`:
solo la service role key (server-only) entra.

**`lib/site-settings.ts`** — tipos, defaults, validación y mappers fila↔objeto.
Sin imports de server, así lo consumen cliente y tests por igual. Espeja la
estructura de `lib/reservation/rate-settings.ts`.

**`lib/site-settings.server.ts`** — `getSiteSettings()` con memo en módulo
(TTL 30s) y **fail-safe a `whatsapp`**: cualquier error de DB devuelve el modo
cerrado. Nunca cobrar si no se puede confirmar el estado. `saveSiteSettings()`
persiste e invalida el memo.

**`lib/booking-mode.ts`** — deja de leer `process.env` directamente. Pasa a:

```ts
export type BookingMode = "whatsapp" | "online";

/** La env var es kill-switch de emergencia y le gana a la DB. */
export function resolveBookingMode(dbMode: BookingMode): BookingMode;
export function isWhatsAppBookingMode(mode: BookingMode): boolean;
```

`NEXT_PUBLIC_BOOKING_MODE` sobrevive como override: si Supabase se rompe, se
setea la env var y se fuerza el modo seguro sin depender de la DB. Mismo patrón
que `?fx=` ganándole a localStorage.

### Flujo de datos

Los 3 componentes que hoy llaman `isWhatsAppBookingMode()` ya son **server
components** (`CtaReserva`, `StickyBookingCard`, `UnitRateCard`), así que el modo
baja **por props** desde las páginas — mismo prop-drilling que ya se usa para
`RateSettings`. No hace falta plomería de cliente.

Consumidores y su origen del dato:

| Consumidor | Cómo lo obtiene |
|---|---|
| `components/home/CtaReserva.tsx` | prop desde `app/[locale]/page.tsx` |
| `components/departamento/StickyBookingCard.tsx` | prop desde `app/[locale]/departamentos/[slug]/page.tsx` |
| `components/tarifas/UnitRateCard.tsx` | prop desde `app/[locale]/tarifas/page.tsx` |
| `app/[locale]/reservas/page.tsx` | `getSiteSettings()` directo (decide el redirect) |
| `app/api/payments/route.ts` | `getSiteSettings()` server-side |
| `app/api/reservations/transfer/route.ts` | `getSiteSettings()` server-side |

**El cliente nunca es fuente de verdad sobre si se puede cobrar.** Las dos rutas
de API leen el modo por su cuenta y devuelven 503 en modo WhatsApp,
independientemente de lo que renderice la UI.

### Panel de administración

`/admin/configuracion` — página nueva, enlazada desde `/admin/reservas` junto a
los links de Tarifas y Pago de prueba. Contiene:

- El estado actual del modo, visible sin ambigüedad.
- El switch, con confirmación explícita antes de abrir el cobro (pasar a `online`
  es la acción de riesgo; cerrar no necesita confirmación).
- Un aviso si `NEXT_PUBLIC_BOOKING_MODE` está seteada y forzando el modo — sin
  esto, el dueño toca el switch, no pasa nada, y no entiende por qué.

Al guardar, la server action hace `revalidatePath` de home, tarifas, reservas y
los 3 departamentos, × 3 locales. **Las de departamentos son SSG**: sin
revalidar seguirían sirviendo el HTML viejo con los CTAs del modo anterior.

### Manejo de errores

| Escenario | Comportamiento |
|---|---|
| Supabase caído al leer | `getSiteSettings()` devuelve `whatsapp`. El sitio se cierra, no se abre. |
| Supabase caído al guardar | La server action devuelve error visible en el panel; el modo no cambia. |
| Tabla `site_settings` inexistente (SQL no corrido) | Mismo fail-safe: modo `whatsapp`, el sitio público funciona normal. |
| Env var forzando el modo | Le gana a la DB; el panel lo avisa. |

---

## Etapas

Orden elegido para que las etapas que dependen de datos del dueño queden al
final y no frenen el avance.

### Etapa A — Destrabar el build

**Por qué primero:** nada se puede deployar mientras `tsc` falle.

- `app/admin/tarifas/actions.ts` — agregar `card_fee_pct` y `transfer_fee_pct`
  al objeto `raw` (hoy `satisfies RateSettingsInput` no compila sin ellos).
- `app/admin/tarifas/RateForm.tsx` — dos campos numéricos (`step=0.1`, rango
  0–30) con ayuda explicando que el valor que se carga es **lo que el lodge
  quiere recibir NETO**; el público paga el gross-up.
- `tests/reservation/payments-route.test.ts` — actualizar la aserción de
  `420000` a `455300`, con el cálculo explicado en el comentario: neto 130.000/
  noche con 7,7% de comisión → 140.900 × 3 noches + limpieza 32.600 grosseada.
- Commitear también los 7 archivos WIP de `components/reservas/*` y las 2 rutas
  de API, que completan la feature.

**Manual del dueño:** correr el bloque `alter table public.rate_settings ...` del
final de `supabase/setup.sql` en el SQL Editor de Supabase.

**Verificación:** `pnpm test` 237/237 · `npx tsc --noEmit` limpio ·
`node ./node_modules/next/dist/bin/next build` completo.

**Commit + push** → publica además los 3 commits que estaban pendientes.

### Etapa B — Toggle de modo de reserva

Todo lo descrito en "Arquitectura del toggle".

**Tests nuevos:**
- `tests/site-settings.test.ts` — validación, mappers, defaults.
- Fail-safe: error de DB → `whatsapp`.
- Precedencia: env var le gana a la DB.
- `tests/booking-mode.test.ts` actualizado a la nueva firma.
- Las 2 rutas de API en ambos modos (503 en `whatsapp`, flujo normal en `online`).

**Manual del dueño:** correr el SQL de `site_settings`.

**Commit + push.**

### Etapa E — Robustez

**Sin dependencias externas.**

- `app/[locale]/error.tsx` y `app/[locale]/not-found.tsx` con la identidad del
  sitio; `app/global-error.tsx` como red final. Hoy un 500 muestra la pantalla
  cruda de Next, sin marca ni salida para el usuario.
- Extraer el rate limit que ya existe en `app/api/reservations/lookup/route.ts`
  a `lib/rate-limit.ts` y aplicarlo también a `/api/payments` y
  `/api/reservations/transfer`. El de transfer acepta uploads de archivos sin
  límite de frecuencia — riesgo de abuso del bucket de comprobantes.
- **Retry de colisión de código de reserva.** `generateBookingCode` genera 32⁴
  ≈ 1M combinaciones sin verificar contra la DB, y `reservations.code` es
  `UNIQUE`. En el flujo de tarjeta el insert ocurre *después* del cobro: una
  colisión significa **plata cobrada sin reserva creada**. `insertReservation`
  detecta el error `23505` de Postgres y reintenta con código nuevo, hasta 5
  veces.

**Tests:** uno por cada uno de los tres puntos.

**Commit + push.**

### Etapa D — Legales + datos bancarios

- `app/[locale]/politicas/cancelacion/page.tsx` y
  `app/[locale]/privacidad/page.tsx`. Contenido en `messages/{es,en,pt}.json`.
- Política de cancelación partiendo de lo que el sitio ya promete
  (`reservas.noFees`: "Cancelación flexible hasta 7 días antes"): reembolso 100%
  cancelando con 7+ días de anticipación, sin reembolso dentro de los 7 días.
  **Los números los confirma el dueño antes del push.**
- Aviso de privacidad cubriendo lo que el sitio realmente recolecta: nombre,
  email, teléfono y comprobantes bancarios (bucket privado en Supabase Storage).
- Enlaces desde `SiteFooter` y desde `StepPago` y `StepTransferencia`.
- **Bug a corregir en `lib/site.ts:22-24`:** usa `process.env.X ?? default`, que
  **no se dispara con string vacío**. Las tres env vars bancarias están vacías en
  `.env.local`, así que hoy el huésped vería campos en blanco, no el placeholder.
  Cambiar a un helper que trate `""` como ausente, y que el paso de transferencia
  falle de forma ruidosa y visible si los datos no están configurados — es
  preferible a mostrar un CBU inválido.

**Manual del dueño:** cargar CBU, alias y titular reales en Netlify y en
`.env.local`; revisar el texto de la política antes del push.

**Commit + push.**

### Etapa F — SEO + analytics

- `NEXT_PUBLIC_SITE_URL` como única fuente de verdad de la URL base, y
  `metadataBase` en el layout. Hoy el canonical está hardcodeado a
  `https://aruma-lodge.netlify.app` en `app/[locale]/page.tsx:50`. Con esto,
  conectar un dominio propio es cambiar una env var y redeployar.
- `app/sitemap.ts` — todas las rutas × 3 locales, con sus alternates.
- `app/robots.ts` — allow explícito a GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot, Google-Extended y CCBot; disallow de `/admin` y `/api`.
- `public/llms.txt` — resumen estructurado del lodge para motores de IA.
- JSON-LD por unidad: `Accommodation` con `offers` y precio real,
  `numberOfRooms`, `occupancy`, `amenityFeature`. Más `BreadcrumbList`.
- `x-default` en los hreflang y URLs absolutas en `alternates.languages`.
- Sacar `aggregateRating: undefined` del JSON-LD de la home — hoy ensucia el
  schema con un campo muerto.
- GA4 vía `@next/third-parties/google`, con el Measurement ID por env var.
- Borrar los 4 `public/canary*.html` — eran el kit de diagnóstico del freeze,
  ya resuelto.

**Manual del dueño:** crear la propiedad GA4 y proveer el `G-XXXXXXX`.

**Commit + push.**

---

## Testing

Cada etapa cierra con la misma tríada **antes** de pushear:

```bash
pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build
```

Ninguna etapa se pushea en rojo. Cada push dispara deploy en Netlify, así que una
etapa rota es una producción rota.

---

## Bloque C diferido — Emails transaccionales

**Por qué se difiere:** Resend con el remitente de prueba `onboarding@resend.dev`
solo permite enviar al email con el que se creó la cuenta, no a huéspedes reales.
Enviar a cualquier destinatario exige verificar un dominio propio (SPF/DKIM), y
hoy no hay dominio. Decisión del dueño: posponer.

**Consecuencia a tener presente:** con este bloque diferido, si se abre el
checkout el huésped paga y **no recibe ninguna confirmación por escrito** — solo
ve el código en pantalla y puede consultarlo en `/mi-reserva`. Peor: la pantalla
de confirmación le dice explícitamente que revise su correo
(`reservas.confirmedSub`: "Guardá tu código y revisá tu email"), un email que
nunca va a llegar. Si se abriera el cobro con este bloque diferido, ese texto
tendría que cambiar primero.

El toggle de la etapa B mitiga todo esto: permite mantener el modo WhatsApp
hasta que los emails funcionen, y abrir el cobro recién entonces.

**Lo que ya existe:** `lib/reservation/email.server.ts` envía la confirmación al
huésped con deduplicación atómica y fail-soft, disparada desde el webhook de MP
y desde la confirmación de transferencia en el panel. El código está listo; le
falta el remitente.

**Lo que falta cuando haya dominio:**

1. Verificar el dominio en Resend y apuntar `ARUMA_EMAIL_FROM` a él.
2. **Email al admin** en cada reserva nueva — tarjeta aprobada y transferencia
   pendiente de revisión de comprobante. Hoy el dueño solo se entera entrando al
   panel.
3. **Email al huésped cuando el admin libera una transferencia** (comprobante
   rechazado). Hoy la fecha se libera en silencio.
4. **Alerta crítica al admin** para el caso de
   `app/api/webhooks/mercadopago/route.ts:88`: pago aprobado pero fechas ya
   ocupadas. Hoy solo hace `console.error` — es plata cobrada sin reserva y
   nadie se entera.
5. Opcional: adjunto `.ics` en la confirmación. `lib/reservation/ics.ts` hoy solo
   parsea disponibilidad, no genera eventos.

## Deuda conocida y aceptada

- **Sin página de términos y condiciones generales.** Decisión explícita del
  dueño; la política de cancelación cubre lo comercial relevante en una reserva.
- **Sin dominio propio.** Impacta posicionamiento (un subdominio `netlify.app`
  arranca con desventaja de autoridad) y bloquea el bloque C. Todo el código de
  la etapa F queda preparado para que conectarlo sea cambiar una env var.
- **`extra_guest_fee` y `base_guests` se guardan pero no se aplican** al cálculo
  — la tarifa sigue siendo plana por unidad. Decisión previa, sin cambios acá.
