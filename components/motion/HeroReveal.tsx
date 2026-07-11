"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { fxDisabled } from "@/lib/fx";

export function HeroReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (fxDisabled()) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = ref.current;
      if (!root) return;
      const targets = Array.from(root.querySelectorAll<HTMLElement>(":scope > *"));
      if (targets.length === 0) return;
      gsap.from(targets, {
        opacity: 0,
        y: 26,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.14,
        delay: 0.15,
      });
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
