// Kill-switch de diagnóstico por query param, para bisecar problemas de
// performance en producción sin redeploys. Un script inline del layout corre
// ANTES de hidratar y traduce la URL a `data-fx` en <html>:
//   (sin param)   → sin data-fx: todos los efectos andan normal
//   ?sinfx=1      → data-fx=""  : TODOS los efectos apagados
//   ?fx=a,b       → data-fx="a b": SOLO esos efectos encendidos
// Features: lenis · trail · figuras · reveals · css (animaciones/transiciones
// CSS, vía globals.css) · grano (FilmGrain, vía globals.css).
export function fxAllowed(feature: string): boolean {
  if (typeof document === "undefined") return true;
  const fx = document.documentElement.dataset.fx;
  if (fx === undefined) return true;
  return fx.split(" ").includes(feature);
}
