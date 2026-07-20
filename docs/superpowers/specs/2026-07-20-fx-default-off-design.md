# Efectos apagados por defecto (paliativo freeze) — Diseño

**Fecha:** 2026-07-20 · **Estado:** aprobado por el usuario (conversación)

## Contexto

La web deployada (aruma-lodge.netlify.app) se congela al cargar en algunas
máquinas — tan duro que ni siquiera el FxWatchdog (auto-degradado por FPS)
alcanza a actuar. Esto bloquea las pruebas del flujo de pago con Mercado Pago.
Se invierte el default: los efectos pesados quedan APAGADOS para todo el mundo
y solo se prenden explícitamente por URL. Es un paliativo reversible; el
diagnóstico de fondo del freeze queda como trabajo aparte.

Infraestructura previa que se aprovecha (ver `lib/fx.ts`):

- `data-fx` en `<html>` gobierna qué efectos corren. Sin atributo = todo
  prendido; `data-fx=""` = todo apagado; `data-fx="a b"` = solo esos.
- Script inline del layout (corre antes de hidratar): `?sinfx=1` → todo
  apagado; `?fx=a,b` → solo esos. La URL le gana a todo.
- Features: `lenis` · `trail` · `figuras` · `reveals` · `css` · `grano`.

## Decisiones

1. **Constante `FX_DEFAULT` en `lib/fx.ts`:** `string | null`. `null` = sin
   atributo (todo prendido, comportamiento histórico). String = valor inicial
   de `data-fx` que el layout renderiza **desde el servidor** en `<html>`.
   Queda en `"css"`.
2. **Default `"css"` (no `""`):** la regla global de `globals.css` mata todas
   las transiciones CSS cuando `data-fx` no incluye `css` — hasta los hovers
   de botones. Con `"css"` se apagan los efectos JS pesados (SelvaTrail,
   SelvaFigure, reveals GSAP, Lenis) y el grano, pero el sitio conserva sus
   transiciones básicas.
3. **Server-side, no script:** el atributo sale renderizado del servidor, así
   los efectos ni llegan a montarse y no hay flash ni dependencia de JS. El
   script inline solo aplica los overrides por URL.
4. **Atajo `?fx=on`:** restaura el modo "todo prendido" (borra `data-fx`),
   para ver las animaciones completas sin afectar a nadie más. Equivale a
   `?fx=lenis,trail,figuras,reveals,css,grano`.
5. **FxWatchdog:** sin cambios. No corre cuando `data-fx` ya está presente,
   o sea queda inerte mientras el default sea apagado. Vuelve a operar solo
   cuando `FX_DEFAULT = null`.

## 🔁 CÓMO REACTIVAR LAS ANIMACIONES (sesiones futuras)

1. En `lib/fx.ts` cambiar `FX_DEFAULT` de `"css"` a `null`.
2. `pnpm test` + `pnpm exec tsc` + build.
3. Commit + push a `main` del repo dedicado
   (github.com/bioornal/arumalodgeweb) → Netlify redeploya solo.
4. **Antes de reactivar:** resolver el freeze de fondo (el watchdog no
   alcanza a degradar en máquinas donde el freeze es inmediato). Sospechosos:
   SelvaTrail (repintado del SVG de página completa en cada frame de scroll)
   + Lenis (RAF). Verificar en una máquina lenta o con CPU throttling 6x.

Mientras tanto, para ver las animaciones en producción: agregar `?fx=on` a la
URL. Para diagnóstico selectivo: `?fx=trail,css`, etc. `?sinfx=1` apaga todo.

## Componentes

- **`lib/fx.ts`:** exporta `FX_DEFAULT` (`"css"`) y helper `fxDefaultAttr()`
  → `{ "data-fx": FX_DEFAULT }` o `{}` si es `null`, para spreadear en el
  `<html>` del layout. `fxAllowed()` no cambia.
- **`app/[locale]/layout.tsx`:** spread de `fxDefaultAttr()` en `<html>`
  (ya tiene `suppressHydrationWarning`). El script inline suma la rama
  `?fx=on` → `delete d.dataset.fx`.
- **Sin cambios:** componentes de motion, `FxWatchdog`, `globals.css`,
  modo booking/pagos.

## Testing

- Unit `lib/fx.ts`: `fxDefaultAttr()` con default actual devuelve
  `data-fx="css"`; con `null` devuelve `{}`.
- El script inline es un string: verificar la rama `fx=on` con un test que
  lo evalúe (mismo patrón que los tests existentes del kill-switch, si los
  hay) o cobertura manual en el navegador.
- Suite completa + tsc + build antes del deploy.

## Deploy

Commit a `main` del repo dedicado → deploy continuo de Netlify → verificar en
vivo: (a) la home carga sin freeze, (b) `?fx=on` muestra las animaciones,
(c) el flujo de reservas sigue intacto.
