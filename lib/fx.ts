// Kill-switch de diagnóstico por query param, para bisecar problemas de
// performance en producción sin redeploys. Un script inline del layout corre
// ANTES de hidratar y traduce la URL a `data-fx` en <html>:
//   (sin param)   → sin data-fx: todos los efectos andan normal
//   ?sinfx=1      → data-fx=""  : TODOS los efectos apagados
//   ?fx=a,b       → data-fx="a b": SOLO esos efectos encendidos
// Features: lenis · trail · figuras · reveals · css (animaciones/transiciones
// CSS, vía globals.css) · grano (FilmGrain, vía globals.css).
//
// Además del modo manual por URL existe el auto-degradado: FxWatchdog mide
// los FPS al cargar y si la máquina no llega graba el flag `aruma-fx-off`
// en localStorage (TTL 24h) y recarga; el mismo script inline lo lee y
// arranca con data-fx="" (la URL siempre le gana al flag).
export function fxAllowed(feature: string): boolean {
  if (typeof document === "undefined") return true;
  const fx = document.documentElement.dataset.fx;
  if (fx === undefined) return true;
  return fx.split(" ").includes(feature);
}

// ── Default del sitio ────────────────────────────────────────────────────
// null = <html> sin data-fx: TODOS los efectos prendidos y el FxWatchdog
// operativo (auto-degrada en máquinas que no llegan). Un string (p.ej.
// "css") se renderiza como data-fx DESDE EL SERVIDOR y deja solo esos
// efectos — modo paliativo usado el 2026-07-20 durante el diagnóstico del
// freeze, que terminó exonerando al sitio (el gatillo era el perfil/
// extensiones de Chrome del usuario; historial completo en
// docs/superpowers/specs/2026-07-20-fx-default-off-design.md y AGENTS.md).
// Overrides por URL sin deploy: ?sinfx=1 (todo off) · ?fx=on (todo on) ·
// ?fx=a,b (solo esos).
export const FX_DEFAULT: string | null = null;

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
