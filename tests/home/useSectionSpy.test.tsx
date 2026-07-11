import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSectionSpy, HOME_SECTION_IDS } from "@/lib/hooks/useSectionSpy";

type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IOCallback;
  observed: Element[] = [];
  constructor(callback: IOCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  document.body.innerHTML = HOME_SECTION_IDS.map(
    (id) => `<section id="${id}"></section>`,
  ).join("");
});

describe("useSectionSpy", () => {
  it("arranca sin sección activa", () => {
    const { result } = renderHook(() => useSectionSpy());
    expect(result.current).toBe("");
  });

  it("observa todas las secciones de la Home", () => {
    renderHook(() => useSectionSpy());
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observed).toHaveLength(
      HOME_SECTION_IDS.length,
    );
  });

  it("marca activa la sección visible con mayor ratio", () => {
    const { result } = renderHook(() => useSectionSpy());
    const io = MockIntersectionObserver.instances[0];
    const galeria = document.getElementById("galeria")!;
    const marca = document.getElementById("marca")!;
    act(() => {
      io.callback([
        { isIntersecting: true, intersectionRatio: 0.2, target: marca },
        { isIntersecting: true, intersectionRatio: 0.6, target: galeria },
      ]);
    });
    expect(result.current).toBe("galeria");
  });

  it("no crea observer si no hay secciones en el DOM", () => {
    document.body.innerHTML = "";
    renderHook(() => useSectionSpy());
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
