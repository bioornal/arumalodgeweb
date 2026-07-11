// Kill-switch de diagnóstico: con ?sinfx=1 en la URL, un script inline del
// layout marca <html class="sin-fx"> ANTES de hidratar. Los componentes de
// motion consultan este flag y no inicializan nada (Lenis, GSAP, scrubs);
// las animaciones/transiciones CSS y el grano se apagan por CSS.
// Sirve para bisecar problemas de performance en producción sin redeploys.
export function fxDisabled(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("sin-fx")
  );
}
