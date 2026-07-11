"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxDisabled } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

// Desvanece el contenido del hero con scrub mientras el hero sale del viewport
export function HeroScrollFade({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (fxDisabled()) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.to(ref.current, {
        opacity: 0,
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: "#top",
          start: "15% top",
          end: "75% top",
          scrub: true,
        },
      });
    },
    { scope: ref },
  );

  return <div ref={ref}>{children}</div>;
}
