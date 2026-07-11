"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

export type FigureKind = "mariposa" | "tucan" | "hoja";

const WING_FORE = "M47 52 C 30 24, 10 22, 8 38 C 7 50, 26 56, 47 55 Z";
const WING_HIND = "M47 57 C 32 62, 20 78, 30 84 C 40 89, 48 72, 47 58 Z";
const ANTENAS = "M50 42 C 46 32, 41 27, 37 24 M50 42 C 54 32, 59 27, 63 24";

const TUCAN_BODY =
  "M55 34 C 70 32, 80 44, 79 58 C 78 74, 66 86, 53 84 C 41 82, 35 71, 37 58 C 39 46, 45 36, 55 34 Z";
const TUCAN_PICO =
  "M56 36 C 47 25, 28 20, 13 27 C 6 30.5, 7 38, 15 40 C 31 44, 47 43, 57 42 Z";
const TUCAN_COLA = "M62 80 C 68 88, 71 96, 64 97 C 57 98, 53 89, 55 83 Z";

const HOJA = "M50 96 C 24 84, 10 52, 26 22 C 34 8, 66 8, 74 22 C 90 52, 76 84, 50 96 Z";
const HOJA_NERVADURAS =
  "M50 92 C 50 70, 50 40, 50 14 M50 70 C 38 62, 30 52, 26 44 M50 52 C 62 46, 70 38, 74 30";

function Figure({ kind }: { kind: FigureKind }) {
  if (kind === "mariposa") {
    return (
      <>
        <path d={WING_FORE} />
        <path d={WING_HIND} />
        <g transform="translate(100 0) scale(-1 1)">
          <path d={WING_FORE} />
          <path d={WING_HIND} />
        </g>
        <ellipse cx="50" cy="56" rx="2.6" ry="14" />
        <path d={ANTENAS} fill="none" stroke="currentColor" strokeWidth="1.4" />
      </>
    );
  }
  if (kind === "tucan") {
    return (
      <>
        <path d={TUCAN_BODY} />
        <path d={TUCAN_PICO} />
        <path d={TUCAN_COLA} />
      </>
    );
  }
  return (
    <>
      <path d={HOJA} />
      <path d={HOJA_NERVADURAS} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </>
  );
}

// Figura selvática decorativa que arranca como contorno vacío y se "llena" de
// color sólido de abajo hacia arriba a medida que la sección entra en el
// viewport (scrub). Va POR DETRÁS del contenido: z-0, mientras los
// contenedores de sección están en z-[1]. Colocarla dentro de una
// <section class="relative"> en una zona de aire (padding/margen) para que no
// cruce texto ni imágenes. `data-selva-figure` la ancla al trazado de
// SelvaTrail, que conecta todas las figuras.
export function SelvaFigure({
  kind,
  className = "",
  color = "#23362B",
  size = 110,
  flip = false,
}: {
  kind: FigureKind;
  className?: string;
  color?: string;
  size?: number;
  flip?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fxAllowed("figuras")) return;
      const el = fillRef.current;
      if (!el) return;
      // Oculta en mobile (display:none) o sin layout (jsdom): sin trigger,
      // el relleno queda en su estado SSR (vacío)
      if (!ref.current || ref.current.getBoundingClientRect().height === 0) return;
      // El llenado corre SIEMPRE (incluso con prefers-reduced-motion): no es
      // animación autónoma — lo conduce el scroll del usuario y sin scroll es
      // estático. Sin JS queda el contorno, que ya es un estado válido.
      gsap.fromTo(
        el,
        { clipPath: "inset(100% 0 0 0)" },
        {
          clipPath: "inset(0% 0 0 0)",
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 92%",
            end: "top 28%",
            scrub: 0.6,
          },
        },
      );
    },
    { scope: ref },
  );

  const svgStyle = flip ? { transform: "scaleX(-1)" } : undefined;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-selva-figure
      className={`pointer-events-none absolute z-[1] hidden md:block ${className}`}
      style={{ color, width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} style={svgStyle} focusable="false">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          strokeOpacity={0.45}
          strokeLinejoin="round"
        >
          <Figure kind={kind} />
        </g>
      </svg>
      <div
        ref={fillRef}
        data-figure-fill
        className="absolute inset-0"
        style={{ clipPath: "inset(100% 0 0 0)" }}
      >
        <svg viewBox="0 0 100 100" width={size} height={size} style={svgStyle} focusable="false">
          <g fill="currentColor" fillOpacity={0.88} stroke="none">
            <Figure kind={kind} />
          </g>
        </svg>
      </div>
    </div>
  );
}
