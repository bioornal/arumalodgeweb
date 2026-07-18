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
