"use client";
import { useEffect, useState } from "react";

export const HOME_SECTION_IDS = [
  "marca",
  "departamentos",
  "experiencias",
  "galeria",
  "contacto",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

// Scrollspy: devuelve el id de la sección visible con mayor ratio ("" al inicio)
export function useSectionSpy(ids: readonly string[] = HOME_SECTION_IDS): string {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
