"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";
import { fxAllowed } from "@/lib/fx";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// null cuando no hay smooth scroll (reduced motion o antes de montar)
const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (!fxAllowed("lenis")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({ duration: 1.1, smoothWheel: true });
    instance.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    // Lenis solo existe en cliente post-montaje; el setState es necesario
    // para publicar la instancia via contexto (un unico re-render).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);
    let dead = false;
    const destroy = () => {
      if (dead) return;
      dead = true;
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
    };
    // FxWatchdog degrada en vivo sin recargar: el smooth scroll (RAF
    // permanente) es lo primero que tiene que morir
    window.addEventListener("aruma:fx-degrade", destroy);
    return () => {
      window.removeEventListener("aruma:fx-degrade", destroy);
      destroy();
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
