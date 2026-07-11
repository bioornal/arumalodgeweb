import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RevealTitle } from "@/components/motion/RevealTitle";

beforeEach(() => {
  // reduced motion → sin animación; el contenido debe estar visible igual
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("RevealTitle", () => {
  it("renderiza el contenido dentro de un wrapper overflow-hidden", () => {
    const { container } = render(
      <RevealTitle>
        <h2>Un título</h2>
      </RevealTitle>,
    );
    expect(screen.getByText("Un título")).toBeInTheDocument();
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("overflow-hidden");
  });

  it("acepta className adicional", () => {
    const { container } = render(
      <RevealTitle className="text-center">
        <h2>Otro</h2>
      </RevealTitle>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "text-center",
    );
  });
});
