# Camino a producción — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el sitio de Aruma Lodge listo para abrir el cobro online, con un toggle en el panel para prender y apagar la reserva online sin redeploy.

**Architecture:** Cinco etapas secuenciales, cada una cerrando con commit + push a `main` (deploy continuo en Netlify). El toggle mueve el modo de reserva de una env var inlineada en build a una tabla de Supabase leída en runtime, con memo de 30s, fail-safe al modo cerrado, y la env var sobreviviendo como kill-switch de emergencia.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind v4 · next-intl (es/en/pt) · Supabase (service role, RLS sin policies) · Mercado Pago · Vitest · Netlify

**Spec:** [`docs/superpowers/specs/2026-07-23-produccion-etapas-design.md`](../specs/2026-07-23-produccion-etapas-design.md)

## Global Constraints

- **Gestor de paquetes: `pnpm`.** Nunca `npm` ni `npx` para instalar.
- **Ninguna etapa se pushea en rojo.** Antes de cada push corré la tríada completa:
  `pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`
- **Push directo a `main`.** Cada push deploya a producción.
- **Fail-safe siempre hacia el modo cerrado.** Ante cualquier duda sobre el estado, el sitio NO cobra.
- **El cliente nunca es fuente de verdad sobre si se puede cobrar.** Las rutas de API leen el modo server-side por su cuenta.
- **RLS activado sin policies** en toda tabla nueva — solo la service role key entra.
- **Textos de cara al público en los 3 idiomas** (`messages/es.json`, `en.json`, `pt.json`). El test `tests/i18n/messages.test.ts` verifica que las claves coincidan entre los 3 archivos.
- **Comisiones:** `cardFeePct` default 7,7 · `transferFeePct` default 5. Rango válido 0–30.
- **Fuente de verdad de la URL base:** `NEXT_PUBLIC_SITE_URL`. Nunca hardcodear el dominio.

## File Structure

**Etapa A** — completar la feature de precios por método
- Modify: `app/admin/tarifas/actions.ts` — agregar los 2 % al objeto `raw`
- Modify: `app/admin/tarifas/RateForm.tsx` — sección nueva con los 2 campos
- Modify: `tests/reservation/payments-route.test.ts` — aserción del gross-up

**Etapa B** — toggle de modo de reserva
- Modify: `supabase/setup.sql` — tabla `site_settings`
- Create: `lib/site-settings.ts` — tipos, defaults, validación, mappers (sin imports de server)
- Create: `lib/site-settings.server.ts` — `getSiteSettings`, `getBookingMode`, `saveSiteSettings`
- Modify: `lib/booking-mode.ts` — funciones puras, env var como override
- Modify: 3 componentes + 3 páginas + 2 rutas de API — el modo baja por props
- Create: `app/admin/configuracion/{page.tsx,actions.ts,ModeToggle.tsx}`
- Create: `tests/site-settings.test.ts`, `tests/site-settings-server.test.ts`

**Etapa E** — robustez
- Create: `app/[locale]/error.tsx`, `app/[locale]/not-found.tsx`, `app/global-error.tsx`
- Create: `lib/rate-limit.ts` — extraído de la ruta de lookup
- Modify: `lib/reservation/reservations.server.ts` — `generateUniqueBookingCode`

**Etapa D** — legales + datos bancarios
- Modify: `lib/site.ts` — `envOrDefault` (string vacío = ausente)
- Create: `app/[locale]/politicas/cancelacion/page.tsx`, `app/[locale]/privacidad/page.tsx`
- Modify: `components/layout/SiteFooter.tsx`, `messages/*.json`

**Etapa F** — SEO + analytics
- Create: `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt`
- Modify: `app/[locale]/layout.tsx` (metadataBase), `app/[locale]/page.tsx`, `app/[locale]/departamentos/[slug]/page.tsx`
- Delete: `public/canary*.html`

---

# ETAPA A — Destrabar el build

Nada se puede deployar mientras `tsc` falle. Esta etapa termina una feature que
está al 90%: `parseRateSettingsInput` **ya valida** `card_fee_pct` y
`transfer_fee_pct`; lo que falta es que el form los mande.

### Task 1: Completar el form de tarifas con los porcentajes por canal

**Files:**
- Modify: `app/admin/tarifas/actions.ts:15-22`
- Modify: `app/admin/tarifas/RateForm.tsx` (sección nueva antes del botón)
- Test: `tests/reservation/payments-route.test.ts:94`

**Interfaces:**
- Consumes: `parseRateSettingsInput(raw: RateSettingsInput)` y `RateSettingsInput = Record<keyof RateSettingsRow, string>` de `lib/reservation/rate-settings.ts` — ya existen y ya contemplan los 2 campos.
- Produces: nada nuevo. Esta task solo cierra la brecha de tipos.

- [ ] **Step 1: Verificar el fallo de tipos actual**

Run: `npx tsc --noEmit`

Expected: FAIL con
```
app/admin/tarifas/actions.ts(22,5): error TS1360: Type '{ nightly_yvyra: string; ... }' does not satisfy the expected type 'RateSettingsInput'.
  ... is missing the following properties from type 'RateSettingsInput': card_fee_pct, transfer_fee_pct
```

- [ ] **Step 2: Agregar los 2 campos al objeto `raw` de la server action**

En `app/admin/tarifas/actions.ts`, reemplazar el objeto `raw` completo por:

```ts
  const raw = {
    nightly_yvyra: String(formData.get("nightly_yvyra") ?? ""),
    nightly_mberu: String(formData.get("nightly_mberu") ?? ""),
    nightly_tatu: String(formData.get("nightly_tatu") ?? ""),
    cleaning_fee: String(formData.get("cleaning_fee") ?? ""),
    base_guests: String(formData.get("base_guests") ?? ""),
    extra_guest_fee: String(formData.get("extra_guest_fee") ?? ""),
    card_fee_pct: String(formData.get("card_fee_pct") ?? ""),
    transfer_fee_pct: String(formData.get("transfer_fee_pct") ?? ""),
  } satisfies RateSettingsInput;
```

- [ ] **Step 3: Verificar que los tipos compilan**

Run: `npx tsc --noEmit`

Expected: sin salida (éxito).

- [ ] **Step 4: Agregar la sección de costos por canal al formulario**

En `app/admin/tarifas/RateForm.tsx`, insertar esta sección completa **después**
del `</section>` de "Tasas" (línea 113) y **antes** del `<div>` del botón
(línea 115):

```tsx
      {/* Costos por canal de cobro */}
      <section style={card}>
        <h2 style={h2}>Costos por canal de cobro</h2>
        <p style={hint}>
          Cargá lo que te cuesta cada canal, no lo que querés cobrar de más. Los precios
          de arriba son lo que querés recibir <strong>neto</strong>: el sitio le suma el
          costo del canal y muestra el precio ya con todo incluido, redondeado a $100.
          El precio de lista que ve el público es el de tarjeta; la transferencia se
          presenta como ahorro.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <div>
            <label htmlFor="card_fee_pct" style={label}>
              Comisión tarjeta (%)
            </label>
            <input
              id="card_fee_pct"
              name="card_fee_pct"
              type="number"
              min={0}
              max={30}
              step={0.1}
              required
              defaultValue={settings.cardFeePct}
              style={input}
            />
          </div>
          <div>
            <label htmlFor="transfer_fee_pct" style={label}>
              Costo transferencia (%)
            </label>
            <input
              id="transfer_fee_pct"
              name="transfer_fee_pct"
              type="number"
              min={0}
              max={30}
              step={0.1}
              required
              defaultValue={settings.transferFeePct}
              style={input}
            />
          </div>
        </div>
      </section>
```

- [ ] **Step 5: Correr el test de payments para ver el fallo actual**

Run: `pnpm vitest run tests/reservation/payments-route.test.ts`

Expected: FAIL con `AssertionError: expected 455300 to be 420000`

- [ ] **Step 6: Corregir la aserción con el cálculo del gross-up**

En `tests/reservation/payments-route.test.ts`, reemplazar las líneas 92-94 por:

```ts
    await POST(post({ ...VALID, amount: 1, total: 1 }));
    // Precio de lista = método TARJETA con la comisión ya incluida (method-pricing.ts):
    //   noche:    130.000 neto / (1 - 0,077) = 140.845,06 → redondeo ↑ a $100 = 140.900
    //   3 noches: 140.900 × 3                                              = 422.700
    //   limpieza:  30.000 neto / (1 - 0,077) =  32.502,71 → redondeo ↑ a $100 =  32.600
    //   total:    422.700 + 32.600                                         = 455.300
    expect(createCardPayment.mock.calls[0][0].amount).toBe(455300);
```

- [ ] **Step 7: Correr la suite completa**

Run: `pnpm test`

Expected: `Test Files 37 passed (37)` · `Tests 237 passed (237)`

- [ ] **Step 8: Verificar el build**

Run: `npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: tsc sin salida; build termina con el resumen de rutas y sin errores.

- [ ] **Step 9: Commit de la feature completa**

Incluye los 7 archivos WIP que ya estaban en el working tree — completan la
misma feature (desglose por método y línea de ahorro en el checkout).

```bash
git add app/admin/tarifas/actions.ts app/admin/tarifas/RateForm.tsx \
        tests/reservation/payments-route.test.ts \
        app/api/payments/route.ts app/api/reservations/transfer/route.ts \
        components/reservas/
git commit -F - <<'EOF'
feat(tarifas): % de costo por canal editables desde el panel

Completa la feature de precios por metodo de pago: el form de /admin/tarifas
mandaba los precios pero no los dos porcentajes, y actions.ts no compilaba.

Incluye el desglose por metodo en el checkout y la linea de ahorro por
transferencia, que estaban implementados pero sin commitear.

Test de payments actualizado al gross-up: 130.000 neto con 7,7% -> 140.900
por noche, total 455.300 para 3 noches en Tatu.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

- [ ] **Step 10: MANUAL — correr el ALTER en Supabase**

En el SQL Editor del dashboard de Supabase, correr el bloque del final de
`supabase/setup.sql`:

```sql
alter table public.rate_settings
  add column if not exists card_fee_pct     numeric(5,2) not null default 7.7,
  add column if not exists transfer_fee_pct numeric(5,2) not null default 5;
```

Sin esto el guardado desde el panel no persiste los %. El sitio público sigue
andando con los defaults (fail-safe de `rate-settings.server.ts`).

- [ ] **Step 11: Push de la etapa A**

Publica también los 3 commits que ya estaban pendientes.

```bash
git push origin main
```

Verificar en el dashboard de Netlify que el deploy termine en verde antes de
seguir con la etapa B.

---

# ETAPA B — Toggle de modo de reserva

### Task 2: Tabla `site_settings` y el módulo compartido

**Files:**
- Modify: `supabase/setup.sql` (agregar al final)
- Create: `lib/site-settings.ts`
- Test: `tests/site-settings.test.ts`

**Interfaces:**
- Produces:
  - `type BookingMode = "whatsapp" | "online"`
  - `type SiteSettings = { bookingMode: BookingMode }`
  - `const DEFAULT_SITE_SETTINGS: SiteSettings` (bookingMode `"whatsapp"`)
  - `type SiteSettingsRow = { booking_mode?: string | null }`
  - `function isBookingMode(v: unknown): v is BookingMode`
  - `function rowToSiteSettings(row: SiteSettingsRow): SiteSettings`
  - `function siteSettingsToRow(s: SiteSettings): SiteSettingsRow`
  - `type SiteSettingsInput = { booking_mode: string }`
  - `function parseSiteSettingsInput(raw: SiteSettingsInput): { ok: true; value: SiteSettings } | { ok: false; error: string }`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/site-settings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  isBookingMode,
  parseSiteSettingsInput,
  rowToSiteSettings,
  siteSettingsToRow,
} from "@/lib/site-settings";

describe("DEFAULT_SITE_SETTINGS", () => {
  it("arranca cerrado: el default es whatsapp, nunca online", () => {
    expect(DEFAULT_SITE_SETTINGS.bookingMode).toBe("whatsapp");
  });
});

describe("isBookingMode", () => {
  it("acepta solo los dos modos válidos", () => {
    expect(isBookingMode("whatsapp")).toBe(true);
    expect(isBookingMode("online")).toBe(true);
  });

  it("rechaza cualquier otra cosa", () => {
    for (const v of ["", "ONLINE", "wa", null, undefined, 1, {}]) {
      expect(isBookingMode(v)).toBe(false);
    }
  });
});

describe("rowToSiteSettings", () => {
  it("mapea una fila válida", () => {
    expect(rowToSiteSettings({ booking_mode: "online" })).toEqual({ bookingMode: "online" });
  });

  it("cae al default si la columna falta o trae basura", () => {
    expect(rowToSiteSettings({}).bookingMode).toBe("whatsapp");
    expect(rowToSiteSettings({ booking_mode: null }).bookingMode).toBe("whatsapp");
    expect(rowToSiteSettings({ booking_mode: "cualquiera" }).bookingMode).toBe("whatsapp");
  });
});

describe("siteSettingsToRow", () => {
  it("es el inverso de rowToSiteSettings", () => {
    const s = { bookingMode: "online" } as const;
    expect(rowToSiteSettings(siteSettingsToRow(s))).toEqual(s);
  });
});

describe("parseSiteSettingsInput", () => {
  it("acepta los modos válidos y limpia espacios", () => {
    expect(parseSiteSettingsInput({ booking_mode: " online " })).toEqual({
      ok: true,
      value: { bookingMode: "online" },
    });
  });

  it("rechaza un modo inválido con mensaje legible", () => {
    const r = parseSiteSettingsInput({ booking_mode: "apagado" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/modo/i);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/site-settings.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/site-settings"`

- [ ] **Step 3: Escribir el módulo**

Crear `lib/site-settings.ts`:

```ts
// Configuración operativa del sitio, editable desde /admin/configuracion.
// Vive en Supabase (tabla site_settings, fila única id=1). Este módulo es la
// forma compartida (server + cliente + tests): sin imports de server.
//
// Espeja la estructura de lib/reservation/rate-settings.ts a propósito — mismo
// patrón, mismo fail-safe, misma separación entre módulo puro y .server.ts.

export type BookingMode = "whatsapp" | "online";

export type SiteSettings = {
  /** "whatsapp": reserva online pausada, los CTAs derivan a WhatsApp. */
  bookingMode: BookingMode;
};

// El default es el modo CERRADO. Si la DB no responde, si la tabla no existe,
// si la columna trae basura: el sitio no cobra. Nunca al revés.
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  bookingMode: "whatsapp",
};

export type SiteSettingsRow = {
  // Puede faltar si aún no se corrió el SQL de setup.
  booking_mode?: string | null;
};

export function isBookingMode(v: unknown): v is BookingMode {
  return v === "whatsapp" || v === "online";
}

export function rowToSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    bookingMode: isBookingMode(row.booking_mode)
      ? row.booking_mode
      : DEFAULT_SITE_SETTINGS.bookingMode,
  };
}

export function siteSettingsToRow(s: SiteSettings): SiteSettingsRow {
  return { booking_mode: s.bookingMode };
}

// ---- Validación de la entrada del formulario admin -------------------------

export type SiteSettingsInput = { booking_mode: string };

export function parseSiteSettingsInput(
  raw: SiteSettingsInput,
): { ok: true; value: SiteSettings } | { ok: false; error: string } {
  const mode = raw.booking_mode.trim();
  if (!isBookingMode(mode)) {
    return { ok: false, error: "Modo de reserva inválido: esperaba 'whatsapp' u 'online'." };
  }
  return { ok: true, value: { bookingMode: mode } };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/site-settings.test.ts`

Expected: PASS, 8 tests.

- [ ] **Step 5: Agregar la tabla al setup.sql**

Agregar al final de `supabase/setup.sql`:

```sql
-- Configuración operativa del sitio (2026-07-23), editable desde
-- /admin/configuracion. Fila única id=1, mismo criterio que rate_settings.
-- booking_mode='whatsapp' pausa la reserva online: los CTAs derivan a WhatsApp,
-- /reservas redirige a /tarifas y los APIs de pago responden 503.
create table if not exists public.site_settings (
  id           smallint primary key default 1 check (id = 1),
  booking_mode text not null default 'whatsapp'
               check (booking_mode in ('whatsapp', 'online')),
  updated_at   timestamptz not null default now()
);

-- Fila inicial en el modo CERRADO: abrir el cobro es siempre una acción explícita.
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- RLS sin policies: solo la service role key (server-only) entra.
alter table public.site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();
```

- [ ] **Step 6: Commit**

```bash
git add lib/site-settings.ts tests/site-settings.test.ts supabase/setup.sql
git commit -F - <<'EOF'
feat(config): tabla site_settings + modulo compartido de booking mode

Fila unica id=1 con booking_mode ('whatsapp' | 'online'), RLS sin policies.
El default es el modo CERRADO: ante cualquier duda el sitio no cobra.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 3: Lectura y escritura server-side con fail-safe

**Files:**
- Create: `lib/site-settings.server.ts`
- Test: `tests/site-settings-server.test.ts`

**Interfaces:**
- Consumes: todo lo que produce Task 2; `getServiceClient()` de `lib/supabase/server.ts`; `resolveBookingMode` de Task 4 (definida en `lib/booking-mode.ts`).
- Produces:
  - `function invalidateSiteSettingsCache(): void`
  - `function getSiteSettings(): Promise<SiteSettings>`
  - `function getBookingMode(): Promise<BookingMode>` — **este es el que usan páginas y rutas**; combina la lectura de DB con el override de la env var
  - `function saveSiteSettings(s: SiteSettings): Promise<void>`

> **Nota de orden:** `getBookingMode` importa `resolveBookingMode` de Task 4.
> Implementá Task 4 antes de correr los tests de esta task, o hacelas juntas.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/site-settings-server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const maybeSingle = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  }),
}));

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_BOOKING_MODE;

async function freshModule() {
  vi.resetModules();
  return import("@/lib/site-settings.server");
}

beforeEach(() => {
  maybeSingle.mockReset();
  upsert.mockReset();
  delete process.env.NEXT_PUBLIC_BOOKING_MODE;
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.NEXT_PUBLIC_BOOKING_MODE;
  else process.env.NEXT_PUBLIC_BOOKING_MODE = ORIGINAL_ENV;
});

describe("getSiteSettings", () => {
  it("lee el modo de la fila id=1", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("online");
  });

  it("memoiza: dos llamadas seguidas pegan una sola vez a la DB", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getSiteSettings } = await freshModule();
    await getSiteSettings();
    await getSiteSettings();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("FAIL-SAFE: si la DB devuelve error cae a whatsapp, no a online", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });

  it("FAIL-SAFE: si la DB tira una excepción cae a whatsapp", async () => {
    maybeSingle.mockRejectedValue(new Error("network down"));
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });

  it("FAIL-SAFE: un error posterior NO conserva el 'online' memoizado", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getSiteSettings, invalidateSiteSettingsCache } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("online");

    invalidateSiteSettingsCache();
    maybeSingle.mockRejectedValue(new Error("network down"));
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });

  it("sin fila (tabla vacía) cae al default cerrado", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { getSiteSettings } = await freshModule();
    expect((await getSiteSettings()).bookingMode).toBe("whatsapp");
  });
});

describe("getBookingMode", () => {
  it("sin env var devuelve lo que dice la DB", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    const { getBookingMode } = await freshModule();
    expect(await getBookingMode()).toBe("online");
  });

  it("KILL-SWITCH: la env var le gana a la DB", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    process.env.NEXT_PUBLIC_BOOKING_MODE = "whatsapp";
    const { getBookingMode } = await freshModule();
    expect(await getBookingMode()).toBe("whatsapp");
  });

  it("una env var con basura NO cuenta como override", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    process.env.NEXT_PUBLIC_BOOKING_MODE = "";
    const { getBookingMode } = await freshModule();
    expect(await getBookingMode()).toBe("online");
  });
});

describe("saveSiteSettings", () => {
  it("hace upsert de la fila id=1 e invalida el memo", async () => {
    maybeSingle.mockResolvedValue({ data: { booking_mode: "whatsapp" }, error: null });
    upsert.mockResolvedValue({ error: null });
    const { getSiteSettings, saveSiteSettings } = await freshModule();

    await getSiteSettings(); // llena el memo con whatsapp
    await saveSiteSettings({ bookingMode: "online" });
    expect(upsert).toHaveBeenCalledWith({ id: 1, booking_mode: "online" });

    maybeSingle.mockResolvedValue({ data: { booking_mode: "online" }, error: null });
    expect((await getSiteSettings()).bookingMode).toBe("online");
  });

  it("propaga el error de la DB para que el panel lo muestre", async () => {
    upsert.mockResolvedValue({ error: { message: "permission denied" } });
    const { saveSiteSettings } = await freshModule();
    await expect(saveSiteSettings({ bookingMode: "online" })).rejects.toThrow(/permission denied/);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/site-settings-server.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/site-settings.server"`

- [ ] **Step 3: Escribir el módulo server**

Crear `lib/site-settings.server.ts`:

```ts
import { getServiceClient } from "@/lib/supabase/server";
import { resolveBookingMode } from "@/lib/booking-mode";
import {
  DEFAULT_SITE_SETTINGS,
  rowToSiteSettings,
  siteSettingsToRow,
  type BookingMode,
  type SiteSettings,
  type SiteSettingsRow,
} from "./site-settings";

// Solo server. Lee/escribe la fila única (id=1) de public.site_settings.
//
// FAIL-SAFE ASIMÉTRICO — la diferencia importante con rate-settings.server.ts:
// ante un error NO devolvemos el valor memoizado, devolvemos el default cerrado.
// Un memo con "online" sobreviviendo a una caída de Supabase dejaría el checkout
// abierto sin poder confirmar el estado real. Un blip de red cierra la reserva
// unos segundos y se recupera solo: es la dirección barata del error.
//
// Cache: memo en módulo con TTL corto (30s), igual que rate-settings — evita un
// SELECT por request sin depender de next/cache. Tras guardar desde el admin se
// invalida el memo y se revalidan las páginas (ver app/admin/configuracion/actions.ts).

const TTL_MS = 30_000;
let memo: { at: number; value: SiteSettings } | null = null;

export function invalidateSiteSettingsCache(): void {
  memo = null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  try {
    const { data, error } = await getServiceClient()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = data ? rowToSiteSettings(data as SiteSettingsRow) : DEFAULT_SITE_SETTINGS;
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * El modo EFECTIVO del sitio: lo que dice la DB, salvo que la env var lo fuerce.
 * Es el punto de entrada único para páginas y rutas de API — no llamar a
 * getSiteSettings() directo para decidir si se puede cobrar.
 */
export async function getBookingMode(): Promise<BookingMode> {
  const settings = await getSiteSettings();
  return resolveBookingMode(settings.bookingMode);
}

export async function saveSiteSettings(s: SiteSettings): Promise<void> {
  const { error } = await getServiceClient()
    .from("site_settings")
    .upsert({ id: 1, ...siteSettingsToRow(s) });
  if (error) throw new Error(`saveSiteSettings: ${error.message}`);
  invalidateSiteSettingsCache();
}
```

- [ ] **Step 4: Correr el test (falla hasta tener Task 4)**

Run: `pnpm vitest run tests/site-settings-server.test.ts`

Expected: FAIL — `resolveBookingMode is not a function`. Es esperado: la produce
la Task 4. Seguí a Task 4 y volvé a correrlo en su Step 4.

---

### Task 4: `booking-mode.ts` como funciones puras con la env var de override

**Files:**
- Modify: `lib/booking-mode.ts` (reescritura completa)
- Test: `tests/booking-mode.test.ts:1-30` (reemplazar los 2 describes de modo)

**Interfaces:**
- Consumes: `isBookingMode`, `type BookingMode` de `lib/site-settings.ts` (Task 2).
- Produces:
  - `function resolveBookingMode(dbMode: BookingMode): BookingMode`
  - `function isWhatsAppBookingMode(mode: BookingMode): boolean` — **cambia de firma**: antes no recibía argumentos y leía `process.env`.
  - `function hasBookingModeOverride(): boolean` — la consume Task 6 para avisar en el panel.
  - `export type { BookingMode }` — re-export, para que los componentes importen el tipo desde acá.

- [ ] **Step 1: Reescribir los tests de modo**

En `tests/booking-mode.test.ts`, reemplazar el import de la línea 2 y los dos
primeros `describe` (líneas 12-27) por esto. **No tocar** los `describe` de
`waLink` que vienen después.

```ts
import { isWhatsAppBookingMode, resolveBookingMode } from "@/lib/booking-mode";
```

```ts
describe("resolveBookingMode", () => {
  it("sin env var manda la DB", () => {
    delete process.env.NEXT_PUBLIC_BOOKING_MODE;
    expect(resolveBookingMode("online")).toBe("online");
    expect(resolveBookingMode("whatsapp")).toBe("whatsapp");
  });

  it("la env var es kill-switch: le gana a la DB en ambas direcciones", () => {
    process.env.NEXT_PUBLIC_BOOKING_MODE = "whatsapp";
    expect(resolveBookingMode("online")).toBe("whatsapp");
    process.env.NEXT_PUBLIC_BOOKING_MODE = "online";
    expect(resolveBookingMode("whatsapp")).toBe("online");
  });

  it("una env var con un valor que no es un modo válido se ignora", () => {
    for (const v of ["", "1", "off", "WHATSAPP"]) {
      process.env.NEXT_PUBLIC_BOOKING_MODE = v;
      expect(resolveBookingMode("online")).toBe("online");
    }
  });
});

describe("isWhatsAppBookingMode", () => {
  it("es true solo para el modo whatsapp", () => {
    expect(isWhatsAppBookingMode("whatsapp")).toBe(true);
    expect(isWhatsAppBookingMode("online")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/booking-mode.test.ts`

Expected: FAIL — `resolveBookingMode is not a function`

- [ ] **Step 3: Reescribir el módulo**

Reemplazar el contenido completo de `lib/booking-mode.ts`:

```ts
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
```

- [ ] **Step 4: Correr los tests de las tasks 3 y 4**

Run: `pnpm vitest run tests/booking-mode.test.ts tests/site-settings-server.test.ts`

Expected: PASS ambos archivos (4 + 3 + 11 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/booking-mode.ts lib/site-settings.server.ts \
        tests/booking-mode.test.ts tests/site-settings-server.test.ts
git commit -F - <<'EOF'
feat(config): booking mode en runtime desde Supabase

getBookingMode() combina la lectura de site_settings con el override de
NEXT_PUBLIC_BOOKING_MODE, que pasa a ser kill-switch de emergencia.

Fail-safe asimetrico: ante error de DB devuelve el default cerrado en vez del
memo. Un "online" memoizado sobreviviendo a una caida dejaria el checkout
abierto sin poder confirmar el estado real.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 5: Cablear el modo a componentes, páginas y rutas de API

**Files:**
- Modify: `components/home/CtaReserva.tsx:7,12`
- Modify: `components/departamento/StickyBookingCard.tsx:4,7,10`
- Modify: `components/departamento/UnitDetail.tsx` (pasa el prop a StickyBookingCard)
- Modify: `components/tarifas/UnitRateCard.tsx:7,27`
- Modify: `app/[locale]/page.tsx` (HomePage)
- Modify: `app/[locale]/tarifas/page.tsx`
- Modify: `app/[locale]/departamentos/[slug]/page.tsx`
- Modify: `app/[locale]/reservas/page.tsx:6,42`
- Modify: `app/api/payments/route.ts:16,43`
- Modify: `app/api/reservations/transfer/route.ts:11,34`
- Test: `tests/reservation/payments-route.test.ts`, `tests/reservation/transfer-route.test.ts`

**Interfaces:**
- Consumes: `getBookingMode()` de Task 3, `isWhatsAppBookingMode(mode)` de Task 4.
- Produces: los 3 componentes ganan un prop `bookingMode: BookingMode`; `UnitDetail` también, para pasarlo a `StickyBookingCard`.

- [ ] **Step 1: Cambiar los 3 componentes a recibir el modo por prop**

En `components/home/CtaReserva.tsx`, reemplazar el import de la línea 7 y la
firma del componente:

```tsx
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
```

```tsx
export function CtaReserva({ bookingMode }: { bookingMode: BookingMode }) {
  const t = useTranslations("cta");
  const whatsappMode = isWhatsAppBookingMode(bookingMode);
```

En `components/departamento/StickyBookingCard.tsx`:

```tsx
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
```

```tsx
export function StickyBookingCard({
  unit,
  price,
  bookingMode,
}: {
  unit: Unit;
  price: number;
  bookingMode: BookingMode;
}) {
  const t = useTranslations("departamento");
  const tb = useTranslations("bookingBar");
  const whatsappMode = isWhatsAppBookingMode(bookingMode);
```

En `components/tarifas/UnitRateCard.tsx`, agregar `bookingMode: BookingMode` al
tipo de props existente, cambiar el import de la línea 7 igual que arriba, y la
línea 27:

```tsx
  const whatsappMode = isWhatsAppBookingMode(bookingMode);
```

- [ ] **Step 2: Pasar el prop a través de `UnitDetail`**

En `components/departamento/UnitDetail.tsx`, agregar `bookingMode: BookingMode`
al tipo de props, importar el tipo, y reenviarlo al `<StickyBookingCard>`:

```tsx
import type { BookingMode } from "@/lib/booking-mode";
```

```tsx
        <StickyBookingCard unit={unit} price={price} bookingMode={bookingMode} />
```

- [ ] **Step 3: Leer el modo en las 3 páginas públicas**

En `app/[locale]/page.tsx`, agregar el import y leer el modo en `HomePage`:

```tsx
import { getBookingMode } from "@/lib/site-settings.server";
```

```tsx
  const { locale } = await params;
  setRequestLocale(locale);
  const bookingMode = await getBookingMode();
```

y en el JSX: `<CtaReserva bookingMode={bookingMode} />`

En `app/[locale]/tarifas/page.tsx`, agregar el import, leer el modo junto a
`settings`, y pasarlo a cada card:

```tsx
import { getBookingMode } from "@/lib/site-settings.server";
```

```tsx
  const settings = await getRateSettings();
  const bookingMode = await getBookingMode();
```

```tsx
              return <UnitRateCard key={unit.slug} unit={unit} rate={rate} query={query} prices={listPrices} bookingMode={bookingMode} />;
```

En `app/[locale]/departamentos/[slug]/page.tsx`:

```tsx
import { getBookingMode } from "@/lib/site-settings.server";
```

```tsx
  const settings = await getRateSettings();
  const bookingMode = await getBookingMode();
```

```tsx
        <UnitDetail unit={unit} locale={locale} prices={settings.nightly} bookingMode={bookingMode} />
```

- [ ] **Step 4: Actualizar la página de reservas**

En `app/[locale]/reservas/page.tsx`, reemplazar el import de la línea 6 y el
bloque del redirect:

```tsx
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { getBookingMode } from "@/lib/site-settings.server";
```

```tsx
  // Reservas online pausadas: el checkout deriva a tarifas (reserva vía WhatsApp).
  if (isWhatsAppBookingMode(await getBookingMode())) {
    redirect(`/${locale}/tarifas`);
  }
```

- [ ] **Step 5: Actualizar las 2 rutas de API**

En `app/api/payments/route.ts`, reemplazar el import de la línea 16 y el guard
de la línea 43:

```ts
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { getBookingMode } from "@/lib/site-settings.server";
```

```ts
  // Reservas online pausadas (modo WhatsApp): no se cobra.
  // Se lee server-side: el cliente nunca decide si se puede cobrar.
  if (isWhatsAppBookingMode(await getBookingMode())) {
```

Aplicar exactamente el mismo cambio en `app/api/reservations/transfer/route.ts`
(import en la línea 11, guard en la 34).

- [ ] **Step 6: Actualizar los mocks de los tests de rutas**

En `tests/reservation/payments-route.test.ts` y
`tests/reservation/transfer-route.test.ts`, agregar este mock junto a los que ya
existen (las rutas ahora importan `site-settings.server`):

```ts
vi.mock("@/lib/site-settings.server", () => ({
  getBookingMode: vi.fn(async () => "online" as const),
}));
```

- [ ] **Step 7: Agregar el test del guard en modo whatsapp**

Agregar a `tests/reservation/payments-route.test.ts`, dentro del `describe`
principal:

```ts
  it("en modo whatsapp responde 503 y no cobra", async () => {
    const { getBookingMode } = await import("@/lib/site-settings.server");
    vi.mocked(getBookingMode).mockResolvedValueOnce("whatsapp");

    const res = await POST(post(VALID));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "bookings_paused" });
    expect(createCardPayment).not.toHaveBeenCalled();
  });
```

- [ ] **Step 8: Correr la suite completa**

Run: `pnpm test`

Expected: todos los archivos en verde. Si algún test de rutas falla por el mock
nuevo, revisá que el `vi.mock` esté antes de los imports del módulo bajo prueba.

- [ ] **Step 9: Verificar tipos y build**

Run: `npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: sin errores. Si `tsc` se queja de un `bookingMode` faltante en algún
JSX, es un consumidor que quedó sin cablear — agregalo.

- [ ] **Step 10: Commit**

```bash
git add components/ app/ tests/
git commit -F - <<'EOF'
feat(config): cablear el booking mode desde la DB a toda la UI

Los 3 componentes que decidian por env var ahora reciben el modo por prop
desde sus paginas (mismo patron que RateSettings). Las 2 rutas de API lo
leen server-side por su cuenta: el cliente nunca decide si se puede cobrar.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 6: Página `/admin/configuracion` con el toggle

**Files:**
- Create: `app/admin/configuracion/page.tsx`
- Create: `app/admin/configuracion/actions.ts`
- Create: `app/admin/configuracion/ModeToggle.tsx`
- Modify: `app/admin/reservas/page.tsx:37` (link nuevo)
- Modify: `app/admin/tarifas/page.tsx:21` (link nuevo)

**Interfaces:**
- Consumes: `getSiteSettings`, `saveSiteSettings` (Task 3); `parseSiteSettingsInput` (Task 2); `hasBookingModeOverride` (Task 4); `signOut` de `app/admin/login/actions.ts`.
- Produces: `type SaveModeState = { ok?: boolean; error?: string } | undefined` y `saveBookingMode(prev, formData)`.

- [ ] **Step 1: Escribir la server action**

Crear `app/admin/configuracion/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { parseSiteSettingsInput } from "@/lib/site-settings";
import { saveSiteSettings } from "@/lib/site-settings.server";

export type SaveModeState = { ok?: boolean; error?: string } | undefined;

export async function saveBookingMode(
  _prev: SaveModeState,
  formData: FormData,
): Promise<SaveModeState> {
  const parsed = parseSiteSettingsInput({
    booking_mode: String(formData.get("booking_mode") ?? ""),
  });
  if (!parsed.ok) return { error: parsed.error };

  try {
    await saveSiteSettings(parsed.value);
  } catch {
    return {
      error:
        "No se pudo guardar en Supabase. ¿Corriste el bloque de site_settings del setup.sql en el SQL Editor?",
    };
  }

  // Las páginas de departamentos son estáticas (prerender): sin revalidar
  // seguirían sirviendo el HTML viejo con los CTAs del modo anterior.
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/tarifas`);
    revalidatePath(`/${locale}/reservas`);
    for (const u of UNITS) revalidatePath(`/${locale}/departamentos/${u.slug}`);
  }

  return { ok: true };
}
```

- [ ] **Step 2: Escribir el componente del toggle**

Crear `app/admin/configuracion/ModeToggle.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { saveBookingMode } from "./actions";
import type { BookingMode } from "@/lib/site-settings";

export function ModeToggle({
  current,
  overridden,
}: {
  current: BookingMode;
  overridden: boolean;
}) {
  const [state, action, pending] = useActionState(saveBookingMode, undefined);
  const isOnline = current === "online";
  const next: BookingMode = isOnline ? "whatsapp" : "online";

  return (
    <div style={card}>
      <h2 style={h2}>Modo de reserva</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isOnline ? "#3f8f5f" : "#b0741d",
          }}
        />
        <strong style={{ fontSize: 17 }}>
          {isOnline ? "Reserva online ABIERTA" : "Reserva online PAUSADA"}
        </strong>
      </div>

      <p style={hint}>
        {isOnline
          ? "Los huéspedes pueden reservar y pagar desde el sitio, con tarjeta o transferencia."
          : "Los botones de reservar derivan a WhatsApp con las fechas prellenadas, /reservas redirige a tarifas y los pagos están bloqueados. El sitio sigue mostrando precios y disponibilidad."}
      </p>

      {overridden && (
        <p role="alert" style={{ ...hint, color: "#8a3b1d", fontWeight: 500 }}>
          ⚠ La variable de entorno NEXT_PUBLIC_BOOKING_MODE está seteada en Netlify y le
          gana a esta configuración. Mientras siga puesta, este botón no cambia nada de
          cara al público: hay que borrarla en Netlify y redeployar.
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="booking_mode" value={next} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (next === "online" && !confirm(
              "Vas a ABRIR el cobro online. Los huéspedes van a poder pagar con tarjeta y transferencia.\n\n¿Verificaste que los datos bancarios y las credenciales de Mercado Pago estén bien?"
            )) {
              e.preventDefault();
            }
          }}
          style={{
            padding: "13px 30px",
            background: pending ? "#8a8170" : next === "online" ? "#23362B" : "#8a3b1d",
            color: "#F8F5F0",
            border: "none",
            borderRadius: 3,
            cursor: pending ? "default" : "pointer",
            fontSize: 12.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          {pending
            ? "Guardando…"
            : next === "online"
              ? "Abrir reserva online"
              : "Pausar reserva online"}
        </button>
      </form>

      {state?.ok && (
        <p style={{ fontSize: 13, color: "#3f8f5f", marginTop: 14 }}>
          Guardado. Recargá esta página para ver el estado nuevo.
        </p>
      )}
      {state?.error && (
        <p role="alert" style={{ fontSize: 13, color: "#8a3b1d", marginTop: 14 }}>
          {state.error}
        </p>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E7E0D4",
  borderRadius: 8,
  padding: 24,
};

const h2: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontWeight: 500,
  fontSize: 22,
  margin: 0,
};

const hint: React.CSSProperties = {
  fontSize: 12.5,
  color: "#6b665d",
  lineHeight: 1.6,
  margin: "0 0 16px",
};
```

- [ ] **Step 3: Escribir la página**

Crear `app/admin/configuracion/page.tsx`:

```tsx
import { getSiteSettings } from "@/lib/site-settings.server";
import { hasBookingModeOverride } from "@/lib/booking-mode";
import { signOut } from "../login/actions";
import { ModeToggle } from "./ModeToggle";

export const metadata = { title: "Configuración — Panel Aruma" };

// Siempre fresco: el admin debe ver lo que está guardado, no una página cacheada.
export const dynamic = "force-dynamic";

export default async function AdminConfiguracionPage() {
  const settings = await getSiteSettings();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 30, margin: 0 }}>
          Configuración
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/admin/reservas" style={navLink}>Reservas</a>
          <a href="/admin/tarifas" style={navLink}>Tarifas</a>
          <form action={signOut}>
            <button type="submit" style={{ background: "transparent", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#6b665d" }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <ModeToggle current={settings.bookingMode} overridden={hasBookingModeOverride()} />
    </div>
  );
}

const navLink: React.CSSProperties = {
  fontSize: 13,
  color: "#6b665d",
  border: "1px solid #E7E0D4",
  borderRadius: 4,
  padding: "8px 14px",
  textDecoration: "none",
};
```

- [ ] **Step 4: Enlazar desde las otras páginas del panel**

En `app/admin/reservas/page.tsx`, agregar después del `<a href="/admin/tarifas">`:

```tsx
          <a href="/admin/configuracion" style={{ fontSize: 13, color: "#6b665d", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", textDecoration: "none" }}>
            Configuración
          </a>
```

En `app/admin/tarifas/page.tsx`, agregar después del `<a href="/admin/reservas">`:

```tsx
          <a href="/admin/configuracion" style={{ fontSize: 13, color: "#6b665d", border: "1px solid #E7E0D4", borderRadius: 4, padding: "8px 14px", textDecoration: "none" }}>
            Configuración
          </a>
```

- [ ] **Step 5: MANUAL — correr el SQL de `site_settings`**

En el SQL Editor de Supabase, correr el bloque `create table ... site_settings`
que se agregó a `supabase/setup.sql` en la Task 2, Step 5.

Verificar: `select * from public.site_settings;` debe devolver una fila con
`booking_mode = 'whatsapp'`.

- [ ] **Step 6: Verificación completa**

Run: `pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: todo verde.

- [ ] **Step 7: Verificación manual del toggle**

1. `pnpm dev`
2. Entrar a `http://localhost:3000/admin/configuracion`
3. Debe mostrar "Reserva online PAUSADA" y el aviso de la env var (porque
   `.env.local` tiene `NEXT_PUBLIC_BOOKING_MODE=whatsapp`)
4. Comentar esa línea en `.env.local`, reiniciar el dev server, recargar
5. El aviso desaparece. Tocar "Abrir reserva online" → confirmar
6. Ir a `/es/tarifas`: los botones deben decir "Reservar" en vez de derivar a WhatsApp
7. Volver a `/admin/configuracion` y pausar. Los botones vuelven a WhatsApp.

- [ ] **Step 8: Commit y push de la etapa B**

```bash
git add app/admin/
git commit -F - <<'EOF'
feat(admin): /admin/configuracion — toggle de reserva online sin redeploy

Switch runtime entre modo WhatsApp y cobro online. Confirmacion explicita
al abrir el cobro (la accion de riesgo); cerrar es directo. Avisa si la env
var NEXT_PUBLIC_BOOKING_MODE esta forzando el modo, para que el toggle no
parezca roto.

Al guardar revalida home, tarifas, reservas y los 3 departamentos x 3
locales: las de departamentos son SSG y serviarian el HTML viejo.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
git push origin main
```

---

# ETAPA E — Robustez

Sin dependencias externas: todo se puede hacer y verificar de una sentada.

### Task 7: Páginas de error con la identidad del sitio

**Files:**
- Create: `app/[locale]/error.tsx`
- Create: `app/[locale]/not-found.tsx`
- Create: `app/global-error.tsx`

**Interfaces:**
- Produces: nada consumido por otras tasks. Next.js los toma por convención de nombre.

- [ ] **Step 1: Crear la página de error de segmento**

Crear `app/[locale]/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";

// Error boundary del segmento [locale]. Sin esto, un throw en cualquier página
// pública muestra la pantalla cruda de Next, sin marca ni salida para el usuario.
// Es un client component por obligación de Next, así que no puede usar
// next-intl server-side: los textos van en castellano, el idioma por defecto.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4EFE7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#8a8170", margin: 0 }}>
        Aruma Lodge
      </p>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontWeight: 400, fontSize: "clamp(28px,4vw,42px)", margin: 0, color: "#1D1D1D" }}>
        Algo se nos rompió
      </h1>
      <p style={{ fontSize: 15, color: "#6b665d", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
        Tuvimos un problema cargando esta página. Podés reintentar, o escribirnos por
        WhatsApp y lo resolvemos al toque.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={reset} style={btnPrimary}>Reintentar</button>
        <a href="https://wa.me/5493757652002" style={btnSecondary}>Escribinos por WhatsApp</a>
      </div>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "13px 28px",
  background: "#23362B",
  color: "#F8F5F0",
  border: "none",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
};

const btnSecondary: React.CSSProperties = {
  padding: "13px 28px",
  background: "transparent",
  color: "#23362B",
  border: "1px solid #23362B",
  borderRadius: 3,
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  textDecoration: "none",
};
```

- [ ] **Step 2: Crear la página 404**

Crear `app/[locale]/not-found.tsx`:

```tsx
import Link from "next/link";

// 404 del segmento [locale]. Server component: no recibe el locale por params
// (Next no se lo pasa a not-found), así que los textos van en castellano.
export default function LocaleNotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4EFE7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#8a8170", margin: 0 }}>
        Error 404
      </p>
      <h1 style={{ fontFamily: "var(--font-display), serif", fontWeight: 400, fontSize: "clamp(28px,4vw,42px)", margin: 0, color: "#1D1D1D" }}>
        Esta página no existe
      </h1>
      <p style={{ fontSize: 15, color: "#6b665d", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
        Puede que el enlace esté viejo o mal escrito. Te dejamos el camino de vuelta.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/es" style={btnPrimary}>Volver al inicio</Link>
        <Link href="/es/tarifas" style={btnSecondary}>Ver tarifas</Link>
      </div>
    </main>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "13px 28px",
  background: "#23362B",
  color: "#F8F5F0",
  border: "none",
  borderRadius: 3,
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  textDecoration: "none",
};

const btnSecondary: React.CSSProperties = {
  padding: "13px 28px",
  background: "transparent",
  color: "#23362B",
  border: "1px solid #23362B",
  borderRadius: 3,
  fontSize: 12.5,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  textDecoration: "none",
};
```

- [ ] **Step 3: Crear el error global**

Crear `app/global-error.tsx`. Reemplaza el layout raíz entero, así que tiene que
traer sus propios `<html>` y `<body>` y no puede depender de estilos del sitio:

```tsx
"use client";

// Red final: se usa solo si falla el layout raíz, cuando ni el error boundary
// de [locale] llega a montarse. Reemplaza el documento completo, por eso lleva
// sus propios <html> y <body> y estilos inline sin depender de globals.css.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F4EFE7", color: "#1D1D1D" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontWeight: 400, fontSize: 32, margin: 0 }}>Aruma Lodge</h1>
          <p style={{ fontSize: 15, color: "#6b665d", maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
            El sitio no está disponible en este momento. Si necesitás reservar, escribinos
            por WhatsApp al +54 9 3757 652002.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "13px 28px",
              background: "#23362B",
              color: "#F8F5F0",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verificar el build**

Run: `npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: sin errores. En la salida del build deben aparecer las rutas nuevas
(`/[locale]/not-found`).

- [ ] **Step 5: Verificación manual del 404**

1. `pnpm dev`
2. Ir a `http://localhost:3000/es/pagina-que-no-existe`
3. Debe verse la página con la marca, no la pantalla por defecto de Next.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/error.tsx app/[locale]/not-found.tsx app/global-error.tsx
git commit -F - <<'EOF'
feat(ui): paginas de error y 404 con la identidad del sitio

Hasta ahora un 500 mostraba la pantalla cruda de Next, sin marca ni salida.
Las tres dan un camino de vuelta y el WhatsApp del lodge.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 8: Rate limit compartido en las rutas de cobro

**Files:**
- Create: `lib/rate-limit.ts`
- Modify: `app/api/reservations/lookup/route.ts:1-27` (usar el módulo)
- Modify: `app/api/payments/route.ts` (aplicar)
- Modify: `app/api/reservations/transfer/route.ts` (aplicar)
- Test: `tests/rate-limit.test.ts`

**Interfaces:**
- Produces:
  - `function clientIp(req: Request): string`
  - `function rateLimited(scope: string, ip: string, max: number, windowMs: number): boolean`
  - `function resetRateLimits(): void` — solo para tests

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clientIp, rateLimited, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("clientIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    const req = new Request("https://x.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("sin header devuelve 'unknown'", () => {
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });
});

describe("rateLimited", () => {
  it("deja pasar hasta el máximo y bloquea el siguiente", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(false);
    }
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
  });

  it("cuenta por IP: una IP saturada no bloquea a otra", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
    expect(rateLimited("pagos", "2.2.2.2", 3, 60_000)).toBe(false);
  });

  it("cuenta por scope: saturar pagos no bloquea lookup", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);
    expect(rateLimited("lookup", "1.1.1.1", 3, 60_000)).toBe(false);
  });

  it("se libera cuando pasa la ventana", () => {
    for (let i = 0; i < 3; i++) rateLimited("pagos", "1.1.1.1", 3, 60_000);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(true);

    vi.advanceTimersByTime(60_001);
    expect(rateLimited("pagos", "1.1.1.1", 3, 60_000)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/rate-limit.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/rate-limit"`

- [ ] **Step 3: Escribir el módulo**

Crear `lib/rate-limit.ts`:

```ts
// Rate limit best-effort por IP, en memoria del proceso.
//
// LIMITACIÓN CONOCIDA: en serverless el contador es POR INSTANCIA, así que no es
// una garantía dura — un atacante distribuido o un escalado agresivo lo diluyen.
// Alcanza para el volumen de un lodge de 3 unidades y para frenar el abuso obvio
// (scripts, reintentos en loop, subida masiva de comprobantes). Si algún día hace
// falta algo serio, el reemplazo es un contador en Supabase o un KV externo.

type Bucket = { count: number; reset: number };

const scopes = new Map<string, Map<string, Bucket>>();

/** Solo para tests: limpia todos los contadores. */
export function resetRateLimits(): void {
  scopes.clear();
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : "unknown";
}

/**
 * Registra un hit y devuelve true si hay que rechazarlo.
 * `scope` separa contadores por endpoint: saturar el checkout no debe
 * bloquear la consulta de reserva.
 */
export function rateLimited(scope: string, ip: string, max: number, windowMs: number): boolean {
  let bucket = scopes.get(scope);
  if (!bucket) {
    bucket = new Map();
    scopes.set(scope, bucket);
  }

  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || now > entry.reset) {
    bucket.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/rate-limit.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Migrar la ruta de lookup al módulo compartido**

En `app/api/reservations/lookup/route.ts`, borrar las líneas 5-25 (las
constantes `WINDOW_MS`/`MAX_HITS`, el `Map`, `rateLimited` y `clientIp` locales)
y reemplazar por el import:

```ts
import { clientIp, rateLimited } from "@/lib/rate-limit";
```

Y cambiar el guard del inicio del POST:

```ts
export async function POST(req: Request) {
  if (rateLimited("lookup", clientIp(req), 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
```

- [ ] **Step 6: Aplicar el rate limit a las 2 rutas de cobro**

En `app/api/payments/route.ts`, agregar el import y el guard **antes** del guard
de booking mode:

```ts
import { clientIp, rateLimited } from "@/lib/rate-limit";
```

```ts
export async function POST(req: Request) {
  // 10 intentos de cobro por minuto por IP: un huésped legítimo reintenta 2 o 3
  // veces si le rebota la tarjeta, nunca diez.
  if (rateLimited("payments", clientIp(req), 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
```

En `app/api/reservations/transfer/route.ts`, igual pero más restrictivo — esta
ruta acepta subida de archivos al bucket de comprobantes:

```ts
import { clientIp, rateLimited } from "@/lib/rate-limit";
```

```ts
export async function POST(req: Request) {
  // 5 por minuto: cada request sube un archivo al bucket de comprobantes.
  if (rateLimited("transfer", clientIp(req), 5, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
```

- [ ] **Step 7: Correr la suite completa**

Run: `pnpm test`

Expected: todo verde, incluido `tests/reservation/lookup-route.test.ts` que ya
existía.

> Si los tests de rutas fallan por acumulación de hits entre casos, agregá
> `beforeEach(() => resetRateLimits())` importando de `@/lib/rate-limit` en el
> archivo de test afectado.

- [ ] **Step 8: Commit**

```bash
git add lib/rate-limit.ts tests/rate-limit.test.ts app/api/
git commit -F - <<'EOF'
feat(api): rate limit compartido en las rutas de cobro

Extrae el limiter que ya existia en lookup a lib/rate-limit.ts, con scope por
endpoint, y lo aplica a /api/payments (10/min) y /api/reservations/transfer
(5/min). La de transfer aceptaba subida de archivos sin ningun limite de
frecuencia: abuso del bucket de comprobantes gratis.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 9: Código de reserva único verificado contra la base

**Files:**
- Modify: `lib/reservation/reservations.server.ts` (agregar 2 funciones)
- Modify: `app/api/payments/route.ts:99` (`const code = ...`)
- Modify: `app/api/reservations/transfer/route.ts:94` (`const code = ...`)
- Test: `tests/reservation/unique-code.test.ts`

**Interfaces:**
- Consumes: `generateBookingCode()` de `lib/reservation/code.ts`, `getServiceClient()`.
- Produces:
  - `function codeExists(code: string): Promise<boolean>`
  - `function generateUniqueBookingCode(attempts?: number): Promise<string>`

**Por qué así y no con retry en el insert:** el código se incrusta en el evento
de Google Calendar y en la metadata del pago de MP, y ambos se crean **antes**
del insert en Supabase. Reintentar con otro código después del choque
desincronizaría las tres cosas. Verificar antes de usarlo hace que, si falla, la
ruta corte **antes de cobrar**.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/reservation/unique-code.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

const generateBookingCode = vi.fn();
vi.mock("@/lib/reservation/code", () => ({ generateBookingCode }));

beforeEach(() => {
  maybeSingle.mockReset();
  generateBookingCode.mockReset();
});

describe("codeExists", () => {
  it("es true si la fila existe", async () => {
    maybeSingle.mockResolvedValue({ data: { code: "ARM-2026-ABCD" }, error: null });
    const { codeExists } = await import("@/lib/reservation/reservations.server");
    expect(await codeExists("ARM-2026-ABCD")).toBe(true);
  });

  it("es false si no existe", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { codeExists } = await import("@/lib/reservation/reservations.server");
    expect(await codeExists("ARM-2026-ZZZZ")).toBe(false);
  });

  it("propaga el error de la DB en vez de asumir que está libre", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { codeExists } = await import("@/lib/reservation/reservations.server");
    await expect(codeExists("ARM-2026-ZZZZ")).rejects.toThrow(/boom/);
  });
});

describe("generateUniqueBookingCode", () => {
  it("devuelve el primer código si está libre", async () => {
    generateBookingCode.mockReturnValue("ARM-2026-AAAA");
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { generateUniqueBookingCode } = await import("@/lib/reservation/reservations.server");

    expect(await generateUniqueBookingCode()).toBe("ARM-2026-AAAA");
    expect(generateBookingCode).toHaveBeenCalledTimes(1);
  });

  it("reintenta cuando choca y devuelve el primero libre", async () => {
    generateBookingCode
      .mockReturnValueOnce("ARM-2026-AAAA")
      .mockReturnValueOnce("ARM-2026-BBBB");
    maybeSingle
      .mockResolvedValueOnce({ data: { code: "ARM-2026-AAAA" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const { generateUniqueBookingCode } = await import("@/lib/reservation/reservations.server");

    expect(await generateUniqueBookingCode()).toBe("ARM-2026-BBBB");
    expect(generateBookingCode).toHaveBeenCalledTimes(2);
  });

  it("tira si agota los intentos, para cortar ANTES de cobrar", async () => {
    generateBookingCode.mockReturnValue("ARM-2026-AAAA");
    maybeSingle.mockResolvedValue({ data: { code: "ARM-2026-AAAA" }, error: null });
    const { generateUniqueBookingCode } = await import("@/lib/reservation/reservations.server");

    await expect(generateUniqueBookingCode(3)).rejects.toThrow(/c[oó]digo libre/i);
    expect(generateBookingCode).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/reservation/unique-code.test.ts`

Expected: FAIL — `codeExists is not a function`

- [ ] **Step 3: Agregar las funciones**

En `lib/reservation/reservations.server.ts`, agregar el import de
`generateBookingCode` arriba y estas dos funciones:

```ts
import { generateBookingCode } from "@/lib/reservation/code";
```

```ts
/** true si ya hay una reserva con ese código. Propaga el error de DB. */
export async function codeExists(code: string): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("reservations")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`codeExists: ${error.message}`);
  return data !== null;
}

/**
 * Código de reserva garantizado libre.
 *
 * `generateBookingCode` sortea sobre 32^4 ≈ 1M combinaciones sin mirar la base, y
 * reservations.code es UNIQUE. Hay que llamar a esto ANTES de crear el evento de
 * calendario y el pago de MP, porque ambos incrustan el código: cambiarlo después
 * del choque los desincronizaría. Verificando antes, si esto falla la ruta corta
 * sin haber cobrado.
 */
export async function generateUniqueBookingCode(attempts = 5): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const code = generateBookingCode();
    if (!(await codeExists(code))) return code;
  }
  throw new Error(
    `generateUniqueBookingCode: no se encontró un código libre en ${attempts} intentos`,
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/reservation/unique-code.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Usarlo en la ruta de pagos**

En `app/api/payments/route.ts`, agregar `generateUniqueBookingCode` al import
existente de `reservations.server`, borrar el import de `generateBookingCode`, y
reemplazar la línea 99:

```ts
  let code: string;
  try {
    code = await generateUniqueBookingCode();
  } catch (err) {
    console.error("[payments] código único fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "code" }, { status: 502 });
  }
```

- [ ] **Step 6: Usarlo en la ruta de transferencia**

En `app/api/reservations/transfer/route.ts`, mismo cambio, reemplazando la
línea 94:

```ts
  let code: string;
  try {
    code = await generateUniqueBookingCode();
  } catch (err) {
    console.error("[transfer] código único fallo:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "code" }, { status: 502 });
  }
```

- [ ] **Step 7: Actualizar los mocks de los tests de rutas**

En `tests/reservation/payments-route.test.ts` y
`tests/reservation/transfer-route.test.ts`, el mock de
`@/lib/reservation/reservations.server` tiene que exportar la función nueva:

```ts
  generateUniqueBookingCode: vi.fn(async () => "ARM-2026-TEST"),
```

- [ ] **Step 8: Verificación completa**

Run: `pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: todo verde.

- [ ] **Step 9: Commit y push de la etapa E**

```bash
git add lib/reservation/reservations.server.ts app/api/ tests/
git commit -F - <<'EOF'
fix(reservas): verificar que el codigo este libre antes de cobrar

generateBookingCode sorteaba sobre 32^4 sin mirar la base y reservations.code
es UNIQUE: una colision en el flujo de tarjeta era plata cobrada sin reserva
creada, porque el insert ocurre despues del cobro.

Se verifica antes de usarlo, no con retry en el insert: el codigo va incrustado
en el evento de calendario y en la metadata del pago, ambos creados antes.
Cambiarlo despues del choque los desincronizaria.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
git push origin main
```

---

# ETAPA D — Legales + datos bancarios

### Task 10: Tratar las env vars vacías como ausentes

**Files:**
- Modify: `lib/site.ts:20-25`
- Test: `tests/site-bank-details.test.ts`

**Interfaces:**
- Produces: `function bankDetailsConfigured(): boolean` — la usa Task 11 y podría usarla el panel a futuro.

**El bug:** `process.env.X ?? "default"` **no se dispara con string vacío**. Las
tres env vars bancarias están vacías en `.env.local`, así que hoy el huésped
vería campos en blanco donde debería ir el CBU.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/site-bank-details.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const KEYS = [
  "NEXT_PUBLIC_ARUMA_BANK_ALIAS",
  "NEXT_PUBLIC_ARUMA_BANK_CBU",
  "NEXT_PUBLIC_ARUMA_BANK_HOLDER",
] as const;

const ORIGINAL = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => vi.resetModules());

afterEach(() => {
  for (const k of KEYS) {
    if (ORIGINAL[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL[k];
  }
});

describe("BANK_DETAILS", () => {
  it("usa los valores reales cuando están seteados", async () => {
    process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS = "ARUMA.REAL";
    process.env.NEXT_PUBLIC_ARUMA_BANK_CBU = "2850590940090418135201";
    process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER = "Aruma Lodge SRL";
    const { BANK_DETAILS } = await import("@/lib/site");
    expect(BANK_DETAILS.alias).toBe("ARUMA.REAL");
    expect(BANK_DETAILS.cbu).toBe("2850590940090418135201");
    expect(BANK_DETAILS.holder).toBe("Aruma Lodge SRL");
  });

  it("un string VACÍO cuenta como ausente y cae al placeholder", async () => {
    for (const k of KEYS) process.env[k] = "";
    const { BANK_DETAILS } = await import("@/lib/site");
    expect(BANK_DETAILS.cbu).toBe("0000000000000000000000");
    expect(BANK_DETAILS.alias).toBe("ARUMA.LODGE.IGUAZU");
  });

  it("un string con solo espacios también cuenta como ausente", async () => {
    for (const k of KEYS) process.env[k] = "   ";
    const { BANK_DETAILS } = await import("@/lib/site");
    expect(BANK_DETAILS.cbu).toBe("0000000000000000000000");
  });
});

describe("bankDetailsConfigured", () => {
  it("es false con los placeholders puestos", async () => {
    for (const k of KEYS) delete process.env[k];
    const { bankDetailsConfigured } = await import("@/lib/site");
    expect(bankDetailsConfigured()).toBe(false);
  });

  it("es true solo con los tres datos reales cargados", async () => {
    process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS = "ARUMA.REAL";
    process.env.NEXT_PUBLIC_ARUMA_BANK_CBU = "2850590940090418135201";
    process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER = "Aruma Lodge SRL";
    const { bankDetailsConfigured } = await import("@/lib/site");
    expect(bankDetailsConfigured()).toBe(true);
  });

  it("es false si falta uno solo de los tres", async () => {
    process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS = "ARUMA.REAL";
    process.env.NEXT_PUBLIC_ARUMA_BANK_CBU = "2850590940090418135201";
    delete process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER;
    const { bankDetailsConfigured } = await import("@/lib/site");
    expect(bankDetailsConfigured()).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/site-bank-details.test.ts`

Expected: FAIL — el caso del string vacío devuelve `""` en vez del placeholder,
y `bankDetailsConfigured` no existe.

- [ ] **Step 3: Corregir `lib/site.ts`**

Reemplazar el bloque `BANK_DETAILS` (líneas 20-25) por:

```ts
// Datos bancarios para pago por transferencia. NEXT_PUBLIC_ porque se leen
// client-side (son datos públicos para que el huésped transfiera).
//
// OJO con `??`: NO se dispara con string vacío. Una env var declarada y vacía en
// Netlify daría "" en vez del placeholder, y el huésped vería el campo del CBU en
// blanco. envOrDefault trata vacío y espacios como ausente.
const PLACEHOLDER_CBU = "0000000000000000000000";

function envOrDefault(raw: string | undefined, fallback: string): string {
  const v = (raw ?? "").trim();
  return v === "" ? fallback : v;
}

export const BANK_DETAILS = {
  alias: envOrDefault(process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS, "ARUMA.LODGE.IGUAZU"),
  cbu: envOrDefault(process.env.NEXT_PUBLIC_ARUMA_BANK_CBU, PLACEHOLDER_CBU),
  holder: envOrDefault(process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER, "Aruma Lodge"),
};

/**
 * true solo si los tres datos bancarios REALES están cargados.
 * El paso de transferencia lo usa para no mostrarle al huésped un CBU inválido:
 * es preferible avisar que el método no está disponible.
 */
export function bankDetailsConfigured(): boolean {
  return (
    BANK_DETAILS.cbu !== PLACEHOLDER_CBU &&
    BANK_DETAILS.alias !== "ARUMA.LODGE.IGUAZU" &&
    BANK_DETAILS.holder !== "Aruma Lodge"
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/site-bank-details.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Avisar en el paso de transferencia si no están configurados**

En `components/reservas/StepTransferencia.tsx`, agregar `bankDetailsConfigured`
al import de `@/lib/site` y, justo antes del `return` del JSX principal:

```tsx
  if (!bankDetailsConfigured()) {
    return (
      <div style={{ padding: 24, background: "#FBF3EC", border: "1px solid #E0C9B4", borderRadius: 6 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#8a3b1d", lineHeight: 1.7 }}>
          El pago por transferencia no está disponible en este momento. Elegí pagar con
          tarjeta, o escribinos por WhatsApp y coordinamos la reserva.
        </p>
      </div>
    );
  }
```

- [ ] **Step 6: Commit**

```bash
git add lib/site.ts components/reservas/StepTransferencia.tsx tests/site-bank-details.test.ts
git commit -F - <<'EOF'
fix(site): env var vacia no es un CBU valido

`process.env.X ?? default` no se dispara con string vacio, y las tres vars
bancarias estan vacias: el huesped habria visto el campo del CBU en blanco.

envOrDefault trata vacio y espacios como ausente, y el paso de transferencia
avisa que el metodo no esta disponible en vez de mostrar un CBU placeholder.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

- [ ] **Step 7: MANUAL — cargar los datos bancarios reales**

En Netlify (Site settings → Environment variables) y en `.env.local`:

```
NEXT_PUBLIC_ARUMA_BANK_ALIAS=<alias real>
NEXT_PUBLIC_ARUMA_BANK_CBU=<CBU real, 22 dígitos>
NEXT_PUBLIC_ARUMA_BANK_HOLDER=<titular de la cuenta>
```

Son `NEXT_PUBLIC_`: se inlinean en el build, así que hay que redeployar.

---

### Task 11: Páginas de cancelación y privacidad

**Files:**
- Create: `app/[locale]/politicas/cancelacion/page.tsx`
- Create: `app/[locale]/privacidad/page.tsx`
- Create: `components/legal/LegalPage.tsx`
- Modify: `messages/es.json`, `messages/en.json`, `messages/pt.json`
- Modify: `components/layout/SiteFooter.tsx`

**Interfaces:**
- Consumes: `SiteNav`, `SiteFooter`, `getTranslations` de next-intl.
- Produces: `LegalPage({ title, updatedAt, children })` — layout compartido por las dos páginas legales.

- [ ] **Step 1: Agregar los textos a `messages/es.json`**

Agregar este bloque de nivel superior (hermano de `"reservas"`, `"meta"`, etc.):

```json
  "legal": {
    "updatedAt": "Última actualización: 23 de julio de 2026",
    "cancelTitle": "Política de cancelación y reembolso",
    "cancelIntro": "Sabemos que los planes cambian. Estas son las condiciones con las que trabajamos, iguales para todas las unidades y todos los métodos de pago.",
    "cancelH1": "Cancelación con 7 días o más de anticipación",
    "cancelP1": "Devolvemos el 100% de lo abonado. El reembolso se hace por la misma vía por la que pagaste y puede demorar hasta 10 días hábiles en acreditarse, según tu banco o tu tarjeta.",
    "cancelH2": "Cancelación dentro de los 7 días previos al check-in",
    "cancelP2": "No corresponde reembolso. Si podés, avisanos igual: si logramos volver a ocupar esas fechas, te devolvemos lo que se haya podido recuperar.",
    "cancelH3": "No presentarse (no-show)",
    "cancelP3": "Si no llegás y no nos avisaste, se toma como cancelación dentro de los 7 días: no corresponde reembolso.",
    "cancelH4": "Cambios de fecha",
    "cancelP4": "Con 7 días o más de anticipación podés mover tu reserva a otras fechas del mismo año, sujeto a disponibilidad y a la tarifa vigente de las fechas nuevas. Escribinos por WhatsApp y lo resolvemos.",
    "cancelH5": "Si cancelamos nosotros",
    "cancelP5": "Si por una razón de fuerza mayor no pudiéramos recibirte, te devolvemos el 100% de lo abonado sin importar cuándo ocurra, y te ayudamos a conseguir alojamiento equivalente en la zona.",
    "cancelH6": "Cómo cancelar",
    "cancelP6": "Escribinos por WhatsApp al +54 9 3757 652002 con tu código de reserva. Vale la fecha y hora del mensaje.",
    "privacyTitle": "Aviso de privacidad",
    "privacyIntro": "Este aviso explica qué datos tuyos guardamos, para qué, y cómo pedirnos que los borremos. Aplica a arumalodge y a las reservas hechas desde este sitio.",
    "privacyH1": "Qué datos recolectamos",
    "privacyP1": "Al reservar te pedimos nombre y apellido, email y teléfono. Si pagás por transferencia, además guardamos el comprobante que subís. Si pagás con tarjeta, los datos de la tarjeta los procesa Mercado Pago directamente: nosotros nunca los vemos ni los almacenamos.",
    "privacyH2": "Para qué los usamos",
    "privacyP2": "Únicamente para gestionar tu reserva: confirmarla, coordinar el check-in, emitir el comprobante y contactarte si surge algo con tu estadía. No los usamos para publicidad ni te mandamos newsletters.",
    "privacyH3": "Con quién los compartimos",
    "privacyP3": "Con nadie, salvo los servicios que necesitamos para que la reserva funcione: Mercado Pago (procesamiento del pago), Supabase (base de datos y almacenamiento de comprobantes) y Google Calendar (agenda de ocupación). No vendemos ni cedemos datos a terceros.",
    "privacyH4": "Cuánto tiempo los guardamos",
    "privacyP4": "Los datos de la reserva se conservan mientras sean necesarios para cumplir con nuestras obligaciones contables e impositivas. Los comprobantes de transferencia se guardan en un espacio privado, no accesible públicamente.",
    "privacyH5": "Tus derechos",
    "privacyP5": "Podés pedirnos en cualquier momento acceder a tus datos, corregirlos o que los borremos, escribiendo a arumalodge.iguazu@gmail.com. Te respondemos dentro de los 10 días corridos.",
    "privacyH6": "Cookies y métricas",
    "privacyP6": "Usamos Google Analytics para entender cómo se navega el sitio (páginas vistas, de dónde llega la gente). Son datos agregados, no te identifican personalmente. Podés bloquearlos desde la configuración de tu navegador.",
    "privacyH7": "Contacto",
    "privacyP7": "Por cualquier consulta sobre tus datos: arumalodge.iguazu@gmail.com o WhatsApp +54 9 3757 652002."
  },
```

- [ ] **Step 2: Traducir el bloque a `messages/en.json`**

Mismas claves, contenido en inglés:

```json
  "legal": {
    "updatedAt": "Last updated: July 23, 2026",
    "cancelTitle": "Cancellation and refund policy",
    "cancelIntro": "We know plans change. These are the terms we work with, the same for every unit and every payment method.",
    "cancelH1": "Cancelling 7 or more days in advance",
    "cancelP1": "We refund 100% of what you paid. The refund goes back through the same method you used and may take up to 10 business days to appear, depending on your bank or card issuer.",
    "cancelH2": "Cancelling within 7 days of check-in",
    "cancelP2": "No refund applies. Let us know anyway: if we manage to rebook those dates, we'll return whatever we're able to recover.",
    "cancelH3": "No-show",
    "cancelP3": "If you don't arrive and didn't tell us, it counts as a cancellation within 7 days: no refund applies.",
    "cancelH4": "Date changes",
    "cancelP4": "With 7 or more days' notice you can move your booking to other dates within the same year, subject to availability and the rate for the new dates. Message us on WhatsApp and we'll sort it out.",
    "cancelH5": "If we cancel",
    "cancelP5": "If circumstances beyond our control mean we can't host you, we refund 100% regardless of when it happens, and we'll help you find equivalent lodging nearby.",
    "cancelH6": "How to cancel",
    "cancelP6": "Message us on WhatsApp at +54 9 3757 652002 with your booking code. The date and time of your message is what counts.",
    "privacyTitle": "Privacy notice",
    "privacyIntro": "This notice explains what data we keep about you, what for, and how to ask us to delete it. It applies to Aruma Lodge and to bookings made through this site.",
    "privacyH1": "What we collect",
    "privacyP1": "When you book we ask for your first and last name, email and phone number. If you pay by bank transfer, we also store the receipt you upload. If you pay by card, Mercado Pago handles the card details directly: we never see or store them.",
    "privacyH2": "What we use it for",
    "privacyP2": "Only to manage your booking: confirming it, arranging check-in, issuing your receipt, and contacting you if something comes up during your stay. We don't use it for advertising and we don't send newsletters.",
    "privacyH3": "Who we share it with",
    "privacyP3": "Nobody, apart from the services we need for the booking to work: Mercado Pago (payment processing), Supabase (database and receipt storage) and Google Calendar (occupancy schedule). We don't sell or hand data to third parties.",
    "privacyH4": "How long we keep it",
    "privacyP4": "Booking data is kept as long as we need it to meet our accounting and tax obligations. Transfer receipts are stored in a private space that isn't publicly accessible.",
    "privacyH5": "Your rights",
    "privacyP5": "You can ask us at any time to access, correct or delete your data by writing to arumalodge.iguazu@gmail.com. We reply within 10 calendar days.",
    "privacyH6": "Cookies and analytics",
    "privacyP6": "We use Google Analytics to understand how the site is browsed (page views, where visitors come from). This is aggregate data and doesn't identify you personally. You can block it from your browser settings.",
    "privacyH7": "Contact",
    "privacyP7": "For any question about your data: arumalodge.iguazu@gmail.com or WhatsApp +54 9 3757 652002."
  },
```

- [ ] **Step 3: Traducir el bloque a `messages/pt.json`**

```json
  "legal": {
    "updatedAt": "Última atualização: 23 de julho de 2026",
    "cancelTitle": "Política de cancelamento e reembolso",
    "cancelIntro": "Sabemos que os planos mudam. Estas são as condições com que trabalhamos, iguais para todas as unidades e todos os meios de pagamento.",
    "cancelH1": "Cancelamento com 7 dias ou mais de antecedência",
    "cancelP1": "Devolvemos 100% do valor pago. O reembolso é feito pelo mesmo meio que você usou e pode levar até 10 dias úteis para aparecer, conforme seu banco ou cartão.",
    "cancelH2": "Cancelamento dentro dos 7 dias anteriores ao check-in",
    "cancelP2": "Não há reembolso. Avise-nos mesmo assim: se conseguirmos ocupar essas datas de novo, devolvemos o que for possível recuperar.",
    "cancelH3": "Não comparecimento (no-show)",
    "cancelP3": "Se você não chegar e não nos avisar, conta como cancelamento dentro dos 7 dias: não há reembolso.",
    "cancelH4": "Mudança de datas",
    "cancelP4": "Com 7 dias ou mais de antecedência você pode mudar sua reserva para outras datas do mesmo ano, sujeito à disponibilidade e à tarifa vigente das novas datas. Escreva no WhatsApp e resolvemos.",
    "cancelH5": "Se nós cancelarmos",
    "cancelP5": "Se por motivo de força maior não pudermos receber você, devolvemos 100% do valor pago, não importa quando aconteça, e ajudamos a encontrar hospedagem equivalente na região.",
    "cancelH6": "Como cancelar",
    "cancelP6": "Escreva no WhatsApp +54 9 3757 652002 com seu código de reserva. Vale a data e hora da mensagem.",
    "privacyTitle": "Aviso de privacidade",
    "privacyIntro": "Este aviso explica quais dados seus guardamos, para quê, e como pedir que sejam apagados. Aplica-se ao Aruma Lodge e às reservas feitas por este site.",
    "privacyH1": "Que dados coletamos",
    "privacyP1": "Ao reservar pedimos nome e sobrenome, e-mail e telefone. Se você pagar por transferência, guardamos também o comprovante enviado. Se pagar com cartão, os dados do cartão são processados diretamente pelo Mercado Pago: nós nunca os vemos nem armazenamos.",
    "privacyH2": "Para que os usamos",
    "privacyP2": "Apenas para gerenciar sua reserva: confirmá-la, combinar o check-in, emitir o comprovante e contatar você se surgir algo durante a estadia. Não usamos para publicidade nem enviamos newsletters.",
    "privacyH3": "Com quem compartilhamos",
    "privacyP3": "Com ninguém, exceto os serviços necessários para a reserva funcionar: Mercado Pago (processamento do pagamento), Supabase (banco de dados e armazenamento de comprovantes) e Google Calendar (agenda de ocupação). Não vendemos nem cedemos dados a terceiros.",
    "privacyH4": "Por quanto tempo guardamos",
    "privacyP4": "Os dados da reserva são mantidos enquanto necessários para cumprir nossas obrigações contábeis e fiscais. Os comprovantes de transferência ficam em um espaço privado, não acessível publicamente.",
    "privacyH5": "Seus direitos",
    "privacyP5": "Você pode pedir a qualquer momento para acessar, corrigir ou apagar seus dados escrevendo para arumalodge.iguazu@gmail.com. Respondemos em até 10 dias corridos.",
    "privacyH6": "Cookies e métricas",
    "privacyP6": "Usamos Google Analytics para entender como o site é navegado (páginas vistas, de onde vêm os visitantes). São dados agregados e não identificam você pessoalmente. Você pode bloqueá-los nas configurações do navegador.",
    "privacyH7": "Contato",
    "privacyP7": "Para qualquer dúvida sobre seus dados: arumalodge.iguazu@gmail.com ou WhatsApp +54 9 3757 652002."
  },
```

- [ ] **Step 4: Verificar que las claves coinciden entre los 3 idiomas**

Run: `pnpm vitest run tests/i18n/messages.test.ts`

Expected: PASS. Si falla, indica exactamente qué clave falta o sobra en cuál archivo.

- [ ] **Step 5: Crear el layout compartido de páginas legales**

Crear `components/legal/LegalPage.tsx`:

```tsx
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

/** Layout de lectura para las páginas legales: una columna angosta y aireada. */
export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <>
      <SiteNav />
      <main style={{ background: "#F4EFE7", minHeight: "100vh", paddingBottom: 110 }}>
        <div style={{ height: 96 }} />
        <article style={{ maxWidth: 680, margin: "0 auto", padding: "44px 24px 0" }}>
          <h1
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 400,
              fontSize: "clamp(30px,4vw,46px)",
              margin: 0,
              color: "#1D1D1D",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 12.5, color: "#8a8170", margin: "12px 0 0", letterSpacing: ".04em" }}>
            {updatedAt}
          </p>
          <p style={{ fontSize: 16, color: "#4a463f", lineHeight: 1.8, margin: "28px 0 0" }}>
            {intro}
          </p>

          {sections.map((s) => (
            <section key={s.heading} style={{ marginTop: 36 }}>
              <h2
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontWeight: 500,
                  fontSize: 22,
                  margin: "0 0 10px",
                  color: "#1D1D1D",
                }}
              >
                {s.heading}
              </h2>
              <p style={{ fontSize: 15, color: "#4a463f", lineHeight: 1.8, margin: 0 }}>
                {s.body}
              </p>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 6: Crear la página de cancelación**

Crear `app/[locale]/politicas/cancelacion/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: `${t("cancelTitle")} — Aruma Lodge`,
    description: t("cancelIntro"),
    alternates: {
      languages: {
        es: "/es/politicas/cancelacion",
        en: "/en/politicas/cancelacion",
        pt: "/pt/politicas/cancelacion",
      },
    },
  };
}

export default async function CancelacionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage
      title={t("cancelTitle")}
      updatedAt={t("updatedAt")}
      intro={t("cancelIntro")}
      sections={[
        { heading: t("cancelH1"), body: t("cancelP1") },
        { heading: t("cancelH2"), body: t("cancelP2") },
        { heading: t("cancelH3"), body: t("cancelP3") },
        { heading: t("cancelH4"), body: t("cancelP4") },
        { heading: t("cancelH5"), body: t("cancelP5") },
        { heading: t("cancelH6"), body: t("cancelP6") },
      ]}
    />
  );
}
```

- [ ] **Step 7: Crear la página de privacidad**

Crear `app/[locale]/privacidad/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: `${t("privacyTitle")} — Aruma Lodge`,
    description: t("privacyIntro"),
    alternates: {
      languages: {
        es: "/es/privacidad",
        en: "/en/privacidad",
        pt: "/pt/privacidad",
      },
    },
  };
}

export default async function PrivacidadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage
      title={t("privacyTitle")}
      updatedAt={t("updatedAt")}
      intro={t("privacyIntro")}
      sections={[
        { heading: t("privacyH1"), body: t("privacyP1") },
        { heading: t("privacyH2"), body: t("privacyP2") },
        { heading: t("privacyH3"), body: t("privacyP3") },
        { heading: t("privacyH4"), body: t("privacyP4") },
        { heading: t("privacyH5"), body: t("privacyP5") },
        { heading: t("privacyH6"), body: t("privacyP6") },
        { heading: t("privacyH7"), body: t("privacyP7") },
      ]}
    />
  );
}
```

- [ ] **Step 8: Enlazar desde el footer**

En `components/layout/SiteFooter.tsx`, dentro de la columna "Contacto" (después
del `<IntlLink href="/mi-reserva">`), agregar:

```tsx
              <IntlLink
                href="/politicas/cancelacion"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tf("cancelPolicy")}
              </IntlLink>
              <IntlLink
                href="/privacidad"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tf("privacy")}
              </IntlLink>
```

Y agregar las 2 claves al namespace del footer en los 3 `messages/*.json`
(el namespace que usa `tf`, junto a `myReservation`):

```json
    "cancelPolicy": "Política de cancelación",
    "privacy": "Privacidad",
```
```json
    "cancelPolicy": "Cancellation policy",
    "privacy": "Privacy",
```
```json
    "cancelPolicy": "Política de cancelamento",
    "privacy": "Privacidade",
```

- [ ] **Step 9: Enlazar desde el checkout**

En `components/reservas/StepPago.tsx`, agregar cerca del botón de pagar:

```tsx
      <p style={{ fontSize: 12, color: "#7e9184", marginTop: 14, lineHeight: 1.6 }}>
        Al confirmar aceptás nuestra{" "}
        <a href="/es/politicas/cancelacion" target="_blank" rel="noopener" style={{ color: "#9DBF9E" }}>
          política de cancelación
        </a>
        .
      </p>
```

- [ ] **Step 10: Verificación completa**

Run: `pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: todo verde. En la salida del build deben aparecer
`/[locale]/politicas/cancelacion` y `/[locale]/privacidad` como rutas estáticas
(3 locales cada una).

- [ ] **Step 11: Verificación manual**

1. `pnpm dev`
2. Visitar `/es/politicas/cancelacion`, `/en/politicas/cancelacion`, `/pt/privacidad`
3. Verificar que el texto esté en el idioma correcto y que los links del footer funcionen

- [ ] **Step 12: MANUAL — revisar la política antes del push**

Leé `/es/politicas/cancelacion` completa y confirmá que los números sean los que
querés: **100% de reembolso con 7+ días, sin reembolso dentro de los 7 días**. Si
cambian, editá `messages/es.json` (y sus traducciones) antes de pushear — una vez
publicada, es lo que el huésped puede reclamarte.

- [ ] **Step 13: Commit y push de la etapa D**

```bash
git add app/[locale]/politicas app/[locale]/privacidad components/legal \
        components/layout/SiteFooter.tsx components/reservas/StepPago.tsx messages/
git commit -F - <<'EOF'
feat(legal): politica de cancelacion y aviso de privacidad

Dos paginas en los 3 idiomas, enlazadas desde el footer y desde el paso de
pago. Cobrando online el huesped tiene que poder leer que pasa si cancela.

El aviso de privacidad cubre lo que el sitio realmente recolecta: nombre,
email, telefono y comprobantes bancarios.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
git push origin main
```

---

# ETAPA F — SEO + analytics

### Task 12: URL base configurable y `metadataBase`

**Files:**
- Create: `lib/seo.ts`
- Modify: `app/[locale]/layout.tsx` (agregar `metadata` export)
- Modify: `app/[locale]/page.tsx:50`
- Test: `tests/seo.test.ts`

**Interfaces:**
- Produces:
  - `const SITE_URL: string` — `NEXT_PUBLIC_SITE_URL` normalizada, sin barra final
  - `function absoluteUrl(path: string): string`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/seo.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => vi.resetModules());

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("SITE_URL", () => {
  it("usa la env var cuando está seteada", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar";
    const { SITE_URL } = await import("@/lib/seo");
    expect(SITE_URL).toBe("https://arumalodge.com.ar");
  });

  it("saca la barra final para que no salgan URLs con doble barra", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar/";
    const { SITE_URL } = await import("@/lib/seo");
    expect(SITE_URL).toBe("https://arumalodge.com.ar");
  });

  it("cae al dominio de Netlify si la env var falta o está vacía", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const a = await import("@/lib/seo");
    expect(a.SITE_URL).toBe("https://aruma-lodge.netlify.app");

    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    const b = await import("@/lib/seo");
    expect(b.SITE_URL).toBe("https://aruma-lodge.netlify.app");
  });
});

describe("absoluteUrl", () => {
  it("arma URLs absolutas normalizando la barra inicial", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar";
    const { absoluteUrl } = await import("@/lib/seo");
    expect(absoluteUrl("/es/tarifas")).toBe("https://arumalodge.com.ar/es/tarifas");
    expect(absoluteUrl("es/tarifas")).toBe("https://arumalodge.com.ar/es/tarifas");
  });

  it("la raíz no deja barra colgando", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar";
    const { absoluteUrl } = await import("@/lib/seo");
    expect(absoluteUrl("/")).toBe("https://arumalodge.com.ar");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/seo.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/seo"`

- [ ] **Step 3: Escribir el módulo**

Crear `lib/seo.ts`:

```ts
// Fuente de verdad de la URL pública del sitio.
//
// Todo lo que emite URLs absolutas —canonical, hreflang, sitemap, OG, JSON-LD—
// pasa por acá. El día que se conecte un dominio propio es cambiar
// NEXT_PUBLIC_SITE_URL en Netlify y redeployar: cero cambios de código.

const FALLBACK = "https://aruma-lodge.netlify.app";

function normalize(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (v === "") return FALLBACK;
  return v.replace(/\/+$/, "");
}

export const SITE_URL = normalize(process.env.NEXT_PUBLIC_SITE_URL);

/** URL absoluta a partir de un path del sitio. `/` devuelve la raíz sin barra. */
export function absoluteUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return clean === "" ? SITE_URL : `${SITE_URL}/${clean}`;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/seo.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 5: Agregar `metadataBase` al layout**

En `app/[locale]/layout.tsx`, agregar el import y el export de metadata después
de `generateStaticParams`:

```tsx
import { SITE_URL } from "@/lib/seo";
```

```tsx
// metadataBase resuelve todas las URLs relativas de metadata (OG, canonical,
// alternates) contra el dominio real. Sin esto Next las emite relativas y los
// crawlers de redes sociales no las resuelven.
export const metadata = {
  metadataBase: new URL(SITE_URL),
};
```

- [ ] **Step 6: Usar el módulo en la home**

En `app/[locale]/page.tsx`, agregar el import y reemplazar la línea 50:

```tsx
import { SITE_URL, absoluteUrl } from "@/lib/seo";
```

```tsx
  const siteUrl = SITE_URL;
```

Y en el mismo `generateMetadata`, cambiar `alternates` para que use URLs
absolutas y agregue `x-default`:

```tsx
    alternates: {
      canonical: canonicalUrl,
      languages: {
        es: absoluteUrl("/es"),
        en: absoluteUrl("/en"),
        pt: absoluteUrl("/pt"),
        "x-default": absoluteUrl("/es"),
      },
    },
```

- [ ] **Step 7: Commit**

```bash
git add lib/seo.ts tests/seo.test.ts app/[locale]/layout.tsx app/[locale]/page.tsx
git commit -F - <<'EOF'
feat(seo): URL base configurable + metadataBase

El canonical estaba hardcodeado a aruma-lodge.netlify.app. Ahora sale de
NEXT_PUBLIC_SITE_URL: conectar un dominio propio es cambiar una env var.

Suma x-default en los hreflang y URLs absolutas en los alternates.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 13: Sitemap, robots y `llms.txt`

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Create: `public/llms.txt`
- Test: `tests/sitemap.test.ts`

**Interfaces:**
- Consumes: `SITE_URL`, `absoluteUrl` (Task 12); `routing.locales`; `UNITS`.
- Produces: nada consumido por otras tasks (Next los toma por convención).

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/sitemap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("sitemap", () => {
  it("incluye la home de los 3 idiomas", () => {
    const urls = sitemap().map((e) => e.url);
    for (const l of ["es", "en", "pt"]) {
      expect(urls.some((u) => u.endsWith(`/${l}`))).toBe(true);
    }
  });

  it("incluye las 3 unidades por idioma", () => {
    const urls = sitemap().map((e) => e.url);
    for (const slug of ["yvyra", "mberu", "tatu"]) {
      for (const l of ["es", "en", "pt"]) {
        expect(urls.some((u) => u.includes(`/${l}/departamentos/${slug}`))).toBe(true);
      }
    }
  });

  it("incluye tarifas y las paginas legales", () => {
    const urls = sitemap().map((e) => e.url).join(" ");
    expect(urls).toContain("/es/tarifas");
    expect(urls).toContain("/es/politicas/cancelacion");
    expect(urls).toContain("/es/privacidad");
  });

  it("NO expone el panel admin ni el checkout", () => {
    const urls = sitemap().map((e) => e.url).join(" ");
    expect(urls).not.toContain("/admin");
    expect(urls).not.toContain("/reservas");
  });

  it("todas las URLs son absolutas y sin doble barra", () => {
    for (const e of sitemap()) {
      expect(e.url).toMatch(/^https:\/\//);
      expect(e.url.replace(/^https:\/\//, "")).not.toContain("//");
    }
  });
});

describe("robots", () => {
  it("bloquea admin y api", () => {
    const rules = robots().rules;
    const all = Array.isArray(rules) ? rules : [rules];
    const generic = all.find((r) => r.userAgent === "*")!;
    expect(generic.disallow).toContain("/admin");
    expect(generic.disallow).toContain("/api");
  });

  it("permite explicitamente a los crawlers de IA", () => {
    const rules = robots().rules;
    const all = Array.isArray(rules) ? rules : [rules];
    const agents = all.flatMap((r) =>
      Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent],
    );
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot"]) {
      expect(agents).toContain(bot);
    }
  });

  it("apunta al sitemap", () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/sitemap.test.ts`

Expected: FAIL — `Failed to resolve import "@/app/sitemap"`

- [ ] **Step 3: Escribir el sitemap**

Crear `app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { absoluteUrl } from "@/lib/seo";

// Rutas públicas indexables. NO incluye /reservas (checkout, sin valor de
// búsqueda), /mi-reserva (privada) ni /admin.
const STATIC_PATHS = ["", "/tarifas", "/politicas/cancelacion", "/privacidad"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : path === "/tarifas" ? 0.9 : 0.3,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)]),
          ),
        },
      });
    }

    for (const unit of UNITS) {
      entries.push({
        url: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, absoluteUrl(`/${l}/departamentos/${unit.slug}`)]),
          ),
        },
      });
    }
  }

  return entries;
}
```

- [ ] **Step 4: Escribir el robots**

Crear `app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Crawlers de motores de IA. Se los permite EXPLÍCITAMENTE: que el lodge
// aparezca citado cuando alguien pregunta por alojamiento en Puerto Iguazú vale
// más que el tráfico que se pierda por el contenido indexado.
const AI_CRAWLERS = [
  "GPTBot",          // OpenAI, entrenamiento
  "OAI-SearchBot",   // OpenAI, búsqueda en ChatGPT
  "ChatGPT-User",    // OpenAI, navegación en vivo
  "ClaudeBot",       // Anthropic
  "Claude-User",     // Anthropic, navegación en vivo
  "PerplexityBot",   // Perplexity
  "Google-Extended", // Gemini / Vertex
  "Applebot-Extended",
  "CCBot",           // Common Crawl (alimenta a varios)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin y /api no tienen nada que indexar y exponen superficie.
        // /mi-reserva es una consulta privada por código + email.
        disallow: ["/admin", "/api", "/mi-reserva"],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/admin", "/api", "/mi-reserva"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/sitemap.test.ts`

Expected: PASS, 8 tests.

- [ ] **Step 6: Escribir el `llms.txt`**

Crear `public/llms.txt`:

```
# Aruma Lodge

> Tres alojamientos turísticos de autor en Puerto Iguazú, Misiones, Argentina.
> Reserva directa sin intermediarios, a 18 km de las Cataratas del Iguazú.

## Alojamientos

- **Suite Yvyrá** — hasta 8 huéspedes, 3 dormitorios, 3 baños, 140 m².
- **Departamento Mberú** — hasta 6 huéspedes, 2 dormitorios, 2 baños, 60 m².
- **Cabaña Tatú** — hasta 5 huéspedes, 2 dormitorios, 1 baño, 65 m².

Tarifa plana por unidad, sin cargo por huésped adicional. Se suma una tasa de
limpieza única por estadía. Precios actualizados en /es/tarifas.

## Ubicación

Santa María del Iguazú esq. Obispo Angelelli, Puerto Iguazú, Misiones, Argentina.
- Cataratas del Iguazú: 18 km
- Aeropuerto Internacional de Puerto Iguazú: 20 km
- Centro de Puerto Iguazú: 6 km

## Servicios

Wi-Fi, aire acondicionado, cocina equipada, estacionamiento, recepción, ropa de
cama y toallas incluidas. No se admiten mascotas.

Check-in 15:00 · Check-out 11:00

## Reservas

- Tarifas y disponibilidad: /es/tarifas
- Política de cancelación: /es/politicas/cancelacion
- Consultar una reserva existente: /es/mi-reserva
- WhatsApp: +54 9 3757 652002
- Email: arumalodge.iguazu@gmail.com

Se paga con tarjeta (Mercado Pago) o transferencia bancaria. Reembolso del 100%
cancelando con 7 o más días de anticipación.

## Idiomas

El sitio está disponible en español (/es), inglés (/en) y portugués (/pt).
```

- [ ] **Step 7: Verificar el build y las rutas generadas**

Run: `npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: en la salida del build deben figurar `/sitemap.xml` y `/robots.txt`.

- [ ] **Step 8: Verificación manual**

1. `pnpm dev`
2. `http://localhost:3000/sitemap.xml` → XML con 21 URLs (3 locales × 4 rutas + 3 locales × 3 unidades)
3. `http://localhost:3000/robots.txt` → debe listar los crawlers de IA y el link al sitemap
4. `http://localhost:3000/llms.txt` → el texto plano

- [ ] **Step 9: Commit**

```bash
git add app/sitemap.ts app/robots.ts public/llms.txt tests/sitemap.test.ts
git commit -F - <<'EOF'
feat(seo): sitemap, robots y llms.txt

Sitemap con las 21 URLs publicas y sus alternates por idioma. Robots con
allow explicito a los crawlers de IA (GPTBot, ClaudeBot, PerplexityBot,
OAI-SearchBot, Google-Extended) y disallow de admin, api y mi-reserva.

llms.txt resume unidades, ubicacion, servicios y politica para que los
motores de IA citen datos correctos en vez de inferirlos.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 14: JSON-LD por unidad y limpieza del schema

**Files:**
- Create: `lib/jsonld.ts`
- Modify: `app/[locale]/page.tsx` (limpiar `LODGING_JSONLD`)
- Modify: `app/[locale]/departamentos/[slug]/page.tsx` (agregar JSON-LD)
- Test: `tests/jsonld.test.ts`

**Interfaces:**
- Consumes: `absoluteUrl` (Task 12); `type Unit`, `UNITS`; `methodRates` de `lib/reservation/method-pricing.ts`; `type RateSettings`.
- Produces:
  - `function accommodationJsonLd(args: { unit: Unit; locale: string; nightlyPrice: number }): object`
  - `function breadcrumbJsonLd(args: { locale: string; unit: Unit }): object`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/jsonld.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { accommodationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { getUnit } from "@/lib/units";

const unit = getUnit("yvyra")!;

describe("accommodationJsonLd", () => {
  const ld = accommodationJsonLd({ unit, locale: "es", nightlyPrice: 216900 }) as Record<string, any>;

  it("es un Accommodation con el nombre de la unidad", () => {
    expect(ld["@type"]).toBe("Accommodation");
    expect(ld.name).toBe("Suite Yvyrá");
  });

  it("publica el precio por noche en ARS", () => {
    expect(ld.offers.price).toBe(216900);
    expect(ld.offers.priceCurrency).toBe("ARS");
  });

  it("declara capacidad y ambientes desde las specs de la unidad", () => {
    expect(ld.occupancy.maxValue).toBe(unit.specs.guests);
    expect(ld.numberOfRooms).toBe(unit.specs.bedrooms);
    expect(ld.floorSize.value).toBe(unit.specs.area);
  });

  it("la URL es absoluta y del idioma pedido", () => {
    expect(ld.url).toMatch(/^https:\/\/.+\/es\/departamentos\/yvyra$/);
  });

  it("no emite campos vacios ni undefined", () => {
    expect(JSON.stringify(ld)).not.toContain("undefined");
  });
});

describe("breadcrumbJsonLd", () => {
  const ld = breadcrumbJsonLd({ locale: "es", unit }) as Record<string, any>;

  it("tiene 3 niveles: inicio, departamentos, unidad", () => {
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[2].name).toBe("Suite Yvyrá");
  });

  it("las posiciones van de 1 a 3 en orden", () => {
    expect(ld.itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm vitest run tests/jsonld.test.ts`

Expected: FAIL — `Failed to resolve import "@/lib/jsonld"`

- [ ] **Step 3: Escribir el módulo**

Crear `lib/jsonld.ts`:

```ts
import type { Unit } from "@/lib/units";
import { absoluteUrl } from "@/lib/seo";

// Datos estructurados por unidad. La home ya declara el LodgingBusiness; esto
// agrega el Accommodation de cada departamento, que es lo que Google y los
// motores de IA usan para responder "cuánto sale", "para cuántos" y "qué tiene".

export function accommodationJsonLd({
  unit,
  locale,
  nightlyPrice,
}: {
  unit: Unit;
  locale: string;
  nightlyPrice: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: unit.name,
    url: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
    numberOfRooms: unit.specs.bedrooms,
    numberOfBathroomsTotal: unit.specs.baths,
    floorSize: { "@type": "QuantitativeValue", value: unit.specs.area, unitCode: "MTK" },
    occupancy: { "@type": "QuantitativeValue", maxValue: unit.specs.guests, unitText: "huéspedes" },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Aire acondicionado", value: true },
      { "@type": "LocationFeatureSpecification", name: "Cocina equipada", value: true },
      { "@type": "LocationFeatureSpecification", name: "Estacionamiento", value: true },
    ],
    offers: {
      "@type": "Offer",
      price: nightlyPrice,
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/${locale}/tarifas`),
    },
    containedInPlace: {
      "@type": "LodgingBusiness",
      name: "Aruma Lodge",
      url: absoluteUrl(`/${locale}`),
    },
  };
}

export function breadcrumbJsonLd({ locale, unit }: { locale: string; unit: Unit }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Aruma Lodge", item: absoluteUrl(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: "Tarifas", item: absoluteUrl(`/${locale}/tarifas`) },
      {
        "@type": "ListItem",
        position: 3,
        name: unit.name,
        item: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
      },
    ],
  };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm vitest run tests/jsonld.test.ts`

Expected: PASS, 7 tests.

- [ ] **Step 5: Emitir el JSON-LD en la página de unidad**

En `app/[locale]/departamentos/[slug]/page.tsx`, agregar los imports:

```tsx
import { accommodationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { methodRates } from "@/lib/reservation/method-pricing";
```

Calcular el precio de lista (el que ve el público, con la comisión incluida) y
emitir los dos bloques al inicio del JSX, antes de `<SiteNav />`:

```tsx
  const listPrices = methodRates(settings, "card").nightly;
```

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            accommodationJsonLd({ unit, locale, nightlyPrice: listPrices[unit.slug] }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd({ locale, unit })) }}
      />
```

- [ ] **Step 6: Limpiar el JSON-LD de la home**

En `app/[locale]/page.tsx`, borrar la línea `aggregateRating: undefined,` del
objeto `LODGING_JSONLD` — `JSON.stringify` la omite, pero deja un campo muerto
que confunde a quien lea el código. Y agregar la URL del sitio:

```tsx
  url: absoluteUrl("/es"),
```

- [ ] **Step 7: Verificación completa**

Run: `pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: todo verde.

- [ ] **Step 8: Validar el schema**

1. `pnpm dev`
2. Abrir `http://localhost:3000/es/departamentos/yvyra`
3. Ver código fuente, copiar el contenido de los `<script type="application/ld+json">`
4. Pegarlo en https://validator.schema.org/ → debe validar sin errores

- [ ] **Step 9: Commit**

```bash
git add lib/jsonld.ts tests/jsonld.test.ts app/[locale]/
git commit -F - <<'EOF'
feat(seo): JSON-LD por unidad + breadcrumbs

Cada departamento declara un Accommodation con precio real, capacidad,
ambientes y superficie: es lo que Google y los motores de IA usan para
responder "cuanto sale" y "para cuantos".

Saca aggregateRating: undefined del schema de la home, un campo muerto.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 15: Google Analytics 4 y limpieza final

**Files:**
- Modify: `package.json` (dependencia `@next/third-parties`)
- Modify: `app/[locale]/layout.tsx`
- Modify: `.env.example`
- Delete: `public/canary.html`, `public/canary-fotos.html`, `public/canary-mapa.html`, `public/canary-suma.html`

**Interfaces:**
- Consumes: `GoogleAnalytics` de `@next/third-parties/google`.
- Produces: nada.

- [ ] **Step 1: Instalar la dependencia**

Run: `pnpm add @next/third-parties`

Expected: se agrega a `dependencies` en `package.json`.

- [ ] **Step 2: Montar GA4 en el layout**

En `app/[locale]/layout.tsx`, agregar el import:

```tsx
import { GoogleAnalytics } from "@next/third-parties/google";
```

Y dentro del `<body>`, después de `</NextIntlClientProvider>`:

```tsx
        {/* GA4. Sin el ID seteado no renderiza nada: en dev y en previews el
            sitio no ensucia las métricas de producción. @next/third-parties lo
            carga con la estrategia afterInteractive, fuera del critical path. */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
```

- [ ] **Step 3: Documentar la env var**

Agregar al final de `.env.example`:

```
# Google Analytics 4. Vacío = no se carga nada (dev y previews limpios).
# Panel: https://analytics.google.com → Administrar → Flujos de datos.
NEXT_PUBLIC_GA_ID=
```

- [ ] **Step 4: Borrar los canarios de diagnóstico**

Eran el kit para diagnosticar el freeze de 2026-07-20, ya resuelto (era una
extensión del Chrome del usuario, no el sitio).

```bash
git rm public/canary.html public/canary-fotos.html public/canary-mapa.html public/canary-suma.html
```

- [ ] **Step 5: Verificación completa**

Run: `pnpm test && npx tsc --noEmit && node ./node_modules/next/dist/bin/next build`

Expected: todo verde.

- [ ] **Step 6: MANUAL — crear la propiedad de GA4**

1. Entrar a https://analytics.google.com
2. Crear una propiedad para Aruma Lodge (zona horaria Argentina, moneda ARS)
3. Crear un flujo de datos web apuntando a la URL del sitio
4. Copiar el **Measurement ID** (formato `G-XXXXXXXXXX`)
5. Cargarlo en Netlify como `NEXT_PUBLIC_GA_ID`

Es `NEXT_PUBLIC_`: se inlinea en el build, hay que redeployar para que tome.

- [ ] **Step 7: Commit y push de la etapa F**

```bash
git add package.json pnpm-lock.yaml app/[locale]/layout.tsx .env.example
git commit -F - <<'EOF'
feat(analytics): GA4 + limpieza de los canarios de diagnostico

GA4 via @next/third-parties, condicionado a NEXT_PUBLIC_GA_ID: sin el ID no
carga nada, asi dev y las previews no ensucian las metricas.

Borra los 4 canary*.html, kit de diagnostico del freeze ya resuelto.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
git push origin main
```

- [ ] **Step 8: Verificación final en producción**

Con el deploy en verde:

1. `https://aruma-lodge.netlify.app/sitemap.xml` → 21 URLs
2. `https://aruma-lodge.netlify.app/robots.txt` → crawlers de IA listados
3. `https://aruma-lodge.netlify.app/llms.txt` → el resumen
4. `https://aruma-lodge.netlify.app/es/politicas/cancelacion` → la política
5. `/admin/configuracion` → el toggle, en modo PAUSADA
6. GA4 → Informes → Tiempo real: navegá el sitio y verificá que registre la visita
7. Enviar la home a https://search.google.com/test/rich-results → el
   LodgingBusiness debe detectarse; probar también una página de unidad

---

## Checklist de cierre

Antes de considerar el trabajo terminado:

- [ ] Las 5 etapas pusheadas, cada deploy en verde
- [ ] `pnpm test` en verde
- [ ] Los 2 bloques SQL corridos en Supabase (`rate_settings` ALTER, `site_settings` CREATE)
- [ ] Datos bancarios reales cargados en Netlify
- [ ] `NEXT_PUBLIC_GA_ID` cargado en Netlify
- [ ] Política de cancelación revisada y aprobada por el dueño
- [ ] El toggle probado en producción en las dos direcciones

**NO abrir el cobro online todavía.** El bloque C (emails) sigue diferido: el
huésped que pague no recibiría confirmación por escrito, y la pantalla de
confirmación le promete un email que no existe. Abrir el checkout es la decisión
que viene después de resolver el dominio y los emails.
