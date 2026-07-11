import "@testing-library/jest-dom/vitest";

// jsdom no implementa matchMedia; GSAP/ScrollTrigger lo invoca al registrarse
// (a nivel de módulo), antes de que cualquier beforeEach corra. Los tests
// individuales pueden sobreescribirlo con vi.stubGlobal según necesiten.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
