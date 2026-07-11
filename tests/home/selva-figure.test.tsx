import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { SelvaFigure } from "@/components/motion/SelvaFigure";

beforeEach(() => {
  // reduced motion → sin scrub; el relleno queda completo (estado final)
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("SelvaFigure", () => {
  it("renderiza contorno + capa de relleno, decorativa y detrás del contenido", () => {
    const { container } = render(<SelvaFigure kind="mariposa" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("pointer-events-none");
    expect(root.className).toContain("z-[1]");
    expect(root.className).toContain("hidden");
    expect(root.className).toContain("md:block");
    expect(root.querySelectorAll("svg")).toHaveLength(2);
    expect(root.querySelector("[data-figure-fill]")).not.toBeNull();
  });

  it("el relleno arranca vacío (clip completo) hasta que el scroll lo pinta", () => {
    const { container } = render(<SelvaFigure kind="tucan" />);
    const fill = container.querySelector("[data-figure-fill]") as HTMLElement;
    expect(fill.style.clipPath).toBe("inset(100% 0 0 0)");
  });

  it("expone el ancla data-selva-figure para el trazado conector", () => {
    const { container } = render(<SelvaFigure kind="hoja" />);
    expect(
      (container.firstElementChild as HTMLElement).hasAttribute("data-selva-figure"),
    ).toBe(true);
  });

  it("cada variante renderiza sus paths", () => {
    for (const kind of ["mariposa", "tucan", "hoja"] as const) {
      const { container, unmount } = render(<SelvaFigure kind={kind} />);
      expect(container.querySelectorAll("path").length).toBeGreaterThan(1);
      unmount();
    }
  });
});
