"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

// Reveal enmascarado: el hijo entra deslizándose desde abajo del wrapper.
// El estado final (visible) es el estado por defecto — sin JS no se oculta nada.
export function RevealTitle({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fxAllowed("reveals")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const inner = ref.current?.firstElementChild;
      if (!inner) return;
      gsap.fromTo(
        inner,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.1,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 85%" },
        },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div>{children}</div>
    </div>
  );
}
