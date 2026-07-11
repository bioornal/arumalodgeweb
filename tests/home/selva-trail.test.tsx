import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { SelvaTrail } from "@/components/motion/SelvaTrail";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe("SelvaTrail", () => {
  it("renderiza el SVG decorativo detrás del contenido sin crashear en jsdom", () => {
    const { container } = render(
      <main>
        <SelvaTrail />
      </main>,
    );
    const svg = container.querySelector("svg")!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList.contains("pointer-events-none")).toBe(true);
    expect(svg.classList.contains("z-[1]")).toBe(true);
    expect(svg.classList.contains("hidden")).toBe(true);
    expect(svg.querySelector("[data-trail-progress]")).not.toBeNull();
  });
});
