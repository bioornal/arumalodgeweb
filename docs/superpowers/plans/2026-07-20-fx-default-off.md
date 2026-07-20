# Efectos apagados por defecto — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invertir el default de efectos visuales: el `<html>` sale del servidor con `data-fx="css"` (efectos JS pesados apagados, transiciones CSS vivas), con override por URL (`?fx=on` restaura todo).

**Architecture:** `lib/fx.ts` pasa a ser la fuente de verdad del default (`FX_DEFAULT`) y del script de arranque (`FX_BOOT_SCRIPT`, hoy inline en el layout — extraerlo lo vuelve testeable). El layout spreadea `fxDefaultAttr()` en `<html>` y consume el script exportado. Nada más cambia: `fxAllowed()`, los componentes de motion, `FxWatchdog` y `globals.css` quedan intactos.

**Tech Stack:** Next.js 16 App Router · TypeScript · Vitest (jsdom) · deploy continuo Netlify desde `main` de `github.com/bioornal/arumalodgeweb`.

**Spec:** `docs/superpowers/specs/2026-07-20-fx-default-off-design.md`

## Global Constraints

- Repo de trabajo: `aruma-web/` (repo git propio). NUNCA tocar el repo con raíz en HOME.
- Features fx válidas: `lenis` · `trail` · `figuras` · `reveals` · `css` · `grano`.
- `FX_DEFAULT = "css"` (paliativo freeze). `null` = comportamiento histórico (todo prendido). Para reactivar en el futuro: cambiar a `null`, test+build, push.
- Comandos: `pnpm test` (vitest run) · `pnpm exec tsc --noEmit` · `pnpm build`.
- Antes de deployar: suite completa verde + tsc 0 errores + build OK.

---

### Task 1: `FX_DEFAULT` + `fxDefaultAttr()` + `FX_BOOT_SCRIPT` en `lib/fx.ts`

**Files:**
- Modify: `lib/fx.ts`
- Test: `tests/fx-default.test.ts` (nuevo)

**Interfaces:**
- Consumes: nada nuevo (el `fxAllowed()` existente no cambia).
- Produces: `FX_DEFAULT: string | null` · `fxDefaultAttr(v?: string | null): { "data-fx"?: string }` · `FX_BOOT_SCRIPT: string` (script que lee la variable libre `location`; la Task 2 lo inyecta en el layout).

- [ ] **Step 1: Write the failing test**

Crear `tests/fx-default.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FX_DEFAULT, fxDefaultAttr, FX_BOOT_SCRIPT } from "@/lib/fx";

/** Ejecuta el script de arranque con una URL dada (inyecta `location`). */
function runBoot(search: string) {
  new Function("location", FX_BOOT_SCRIPT)({ search });
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.fx;
});

afterEach(() => {
  delete document.documentElement.dataset.fx;
});

describe("fxDefaultAttr", () => {
  it("el default vigente es 'css' (paliativo freeze) y sale como data-fx", () => {
    expect(FX_DEFAULT).toBe("css");
    expect(fxDefaultAttr()).toEqual({ "data-fx": "css" });
  });

  it("con null (modo histórico) no emite atributo", () => {
    expect(fxDefaultAttr(null)).toEqual({});
  });
});

describe("FX_BOOT_SCRIPT", () => {
  it("sin params respeta el data-fx que puso el server", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("");
    expect(document.documentElement.dataset.fx).toBe("css");
  });

  it("?sinfx=1 apaga todo", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("?sinfx=1");
    expect(document.documentElement.dataset.fx).toBe("");
  });

  it("?fx=trail,css prende solo esos", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("?fx=trail,css");
    expect(document.documentElement.dataset.fx).toBe("trail css");
  });

  it("?fx=on borra el atributo (todo prendido)", () => {
    document.documentElement.dataset.fx = "css";
    runBoot("?fx=on");
    expect(document.documentElement.dataset.fx).toBeUndefined();
  });

  it("el flag aruma-fx-off del watchdog apaga todo si no hay params", () => {
    document.documentElement.dataset.fx = "css";
    localStorage.setItem("aruma-fx-off", String(Date.now()));
    runBoot("");
    expect(document.documentElement.dataset.fx).toBe("");
  });

  it("el flag vencido (>24h) no hace nada", () => {
    document.documentElement.dataset.fx = "css";
    localStorage.setItem("aruma-fx-off", String(Date.now() - 25 * 60 * 60 * 1000));
    runBoot("");
    expect(document.documentElement.dataset.fx).toBe("css");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/fx-default.test.ts`
Expected: FAIL — `FX_DEFAULT`, `fxDefaultAttr`, `FX_BOOT_SCRIPT` no existen en `@/lib/fx`.

- [ ] **Step 3: Write minimal implementation**

En `lib/fx.ts`, agregar al final (sin tocar `fxAllowed`):

```ts
// ── Default del sitio ────────────────────────────────────────────────────
// PALIATIVO FREEZE (2026-07-20): los efectos JS pesados arrancan APAGADOS
// para todo el mundo. "css" mantiene vivas las transiciones CSS (hovers,
// menús) pero apaga lenis/trail/figuras/reveals/grano. El layout renderiza
// este valor como data-fx en <html> DESDE EL SERVIDOR (los efectos ni se
// montan; sin flash ni dependencia de JS).
//
// 🔁 PARA REACTIVAR LAS ANIMACIONES: cambiar FX_DEFAULT a null (= sin
// atributo, todo prendido, vuelve a operar el FxWatchdog), correr
// `pnpm test` + `pnpm exec tsc --noEmit` + `pnpm build`, commit y push a
// main → Netlify redeploya. Antes de hacerlo, resolver el freeze de fondo
// (ver docs/superpowers/specs/2026-07-20-fx-default-off-design.md).
// Para VERLAS sin deploy: agregar ?fx=on a la URL.
export const FX_DEFAULT: string | null = "css";

/** Atributo data-fx inicial para el <html> del layout (server-rendered). */
export function fxDefaultAttr(v: string | null = FX_DEFAULT): { "data-fx"?: string } {
  return v === null ? {} : { "data-fx": v };
}

// Script de arranque (inline en el layout, corre ANTES de hidratar).
// Traduce la URL a data-fx pisando el default del server:
//   ?sinfx=1 → todo apagado · ?fx=on → todo prendido (borra el atributo) ·
//   ?fx=a,b → solo esos. Sin params: si el FxWatchdog grabó aruma-fx-off
//   (TTL 24h) apaga todo; si no, queda lo que puso el server.
export const FX_BOOT_SCRIPT =
  'var d=document.documentElement,q=location.search,m=q.match(/[?&]fx=([^&]*)/);' +
  'if(q.indexOf("sinfx")>-1)d.dataset.fx="";' +
  'else if(m){var v=decodeURIComponent(m[1]);' +
  'if(v==="on")delete d.dataset.fx;else d.dataset.fx=v.replace(/,/g," ");}' +
  'else{try{var t=+localStorage.getItem("aruma-fx-off");' +
  'if(t&&Date.now()-t<864e5)d.dataset.fx="";}catch(e){}}';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/fx-default.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/fx.ts tests/fx-default.test.ts
git commit -m "feat(fx): FX_DEFAULT='css' + boot script testeable (paliativo freeze)"
```

---

### Task 2: layout consume `fxDefaultAttr()` + `FX_BOOT_SCRIPT`, constancia en AGENTS.md

**Files:**
- Modify: `app/[locale]/layout.tsx`
- Modify: `AGENTS.md` (sección "Cambios recientes" + "Notas")

**Interfaces:**
- Consumes: `fxDefaultAttr()` y `FX_BOOT_SCRIPT` de `@/lib/fx` (Task 1).
- Produces: `<html>` server-rendered con `data-fx="css"`; script inline con la rama `?fx=on`.

- [ ] **Step 1: Editar el layout**

En `app/[locale]/layout.tsx`:

1. Agregar el import:

```ts
import { fxDefaultAttr, FX_BOOT_SCRIPT } from "@/lib/fx";
```

2. Reemplazar el `<html ...>` para spreadear el default (queda así):

```tsx
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable}`}
      {...fxDefaultAttr()}
      suppressHydrationWarning
    >
```

3. Reemplazar el `<script dangerouslySetInnerHTML={{...}} />` (el bloque con
   el string concatenado) y su comentario por:

```tsx
        {/* Kill-switch de efectos (ver lib/fx.ts): el server ya manda
            data-fx=FX_DEFAULT; este script aplica los overrides por URL
            (?sinfx=1 / ?fx=on / ?fx=lista) y el flag del FxWatchdog antes
            de hidratar. La URL siempre le gana al flag. */}
        <script dangerouslySetInnerHTML={{ __html: FX_BOOT_SCRIPT }} />
```

- [ ] **Step 2: Dejar constancia en AGENTS.md**

En `AGENTS.md`, dentro de "## Cambios recientes", agregar arriba de la entrada del 2026-07-19:

```markdown
- **2026-07-20:**
  - **Efectos APAGADOS por defecto** (paliativo freeze): `FX_DEFAULT="css"` en
    `lib/fx.ts` → el `<html>` sale del servidor con `data-fx="css"` (quedan las
    transiciones CSS; lenis/trail/figuras/reveals/grano apagados). Para VER las
    animaciones: `?fx=on` en la URL. 🔁 Para REACTIVARLAS para el público:
    `FX_DEFAULT = null` en `lib/fx.ts` + test/tsc/build + push (instrucciones
    completas en `docs/superpowers/specs/2026-07-20-fx-default-off-design.md`).
    Motivo: freeze duro al cargar en máquinas sin GPU que ni el watchdog con
    deadman alcanzaba a salvar — bloqueaba las pruebas de Mercado Pago.
```

Y en "## Notas", agregar al final:

```markdown
- Efectos visuales apagados por defecto desde 2026-07-20 (`FX_DEFAULT` en `lib/fx.ts`); `?fx=on` los muestra. Reactivación global: poner `null` y redeployar.
```

- [ ] **Step 3: Verificación completa**

Run: `pnpm test`
Expected: suite completa verde (los tests de FxWatchdog, SelvaTrail/Figure y booking-mode no dependen del default del layout).

Run: `pnpm exec tsc --noEmit`
Expected: 0 errores.

Run: `pnpm build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/layout.tsx AGENTS.md
git commit -m "feat(layout): html nace con data-fx=css + atajo ?fx=on (paliativo freeze)"
```

---

### Task 3: Deploy y verificación en vivo

**Files:** ninguno (git push + verificación en el navegador).

**Interfaces:**
- Consumes: commits de Task 1 y 2 en `main`.
- Produces: producción sin freeze; animaciones visibles solo con `?fx=on`.

- [ ] **Step 1: Push (dispara el deploy continuo de Netlify)**

```bash
git push origin main
```

Expected: push OK; Netlify inicia build automáticamente.

- [ ] **Step 2: Esperar el deploy y verificar en vivo**

En el navegador (esperar ~2-4 min al deploy):

1. `https://aruma-lodge.netlify.app/` → ver en el DOM que `<html>` tiene `data-fx="css"`, que NO existe el `<svg>` del trail con trazado (`[data-trail-progress]` sin `d` animado) y que la página scrollea normal.
2. `https://aruma-lodge.netlify.app/?fx=on` → `<html>` sin `data-fx`; la línea y las figuras se pintan al scrollear.
3. Flujo de reservas intacto (home → tarifas → CTA WhatsApp mientras siga el modo WhatsApp).

Expected: (1) carga liviana sin efectos, (2) animaciones completas, (3) sin regresiones.

- [ ] **Step 3: Reportar al usuario**

Confirmar con evidencia (screenshot o lectura del DOM) que producción carga sin efectos y que `?fx=on` los restaura.
