"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxAllowed } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

export type FigureKind = "mariposa" | "coati" | "bambu";

const WING_FORE = "M47 52 C 30 24, 10 22, 8 38 C 7 50, 26 56, 47 55 Z";
const WING_HIND = "M47 57 C 32 62, 20 78, 30 84 C 40 89, 48 72, 47 58 Z";
const ANTENAS = "M50 42 C 46 32, 41 27, 37 24 M50 42 C 54 32, 59 27, 63 24";

// Coatí (Nasua nasua) de perfil, mirando a la derecha: hocico largo caído y
// cola erguida y anillada son los dos rasgos que lo hacen reconocible en
// silueta, así que van marcados de más.
const COATI_CUERPO =
  "M30 62 C 30 52, 42 47, 54 47 C 68 47, 76 53, 76 62 C 76 71, 66 76, 53 76 C 40 76, 30 71, 30 62 Z";
const COATI_CABEZA =
  "M67 54 C 66 45, 72 38, 80 38 C 84 38, 88 40, 90 44 C 93 47, 94 52, 92 55 C 96 57, 99 60, 98 62 C 96 64, 90 62, 86 60 C 80 61, 71 60, 67 54 Z";
const COATI_COLA =
  "M32 60 C 22 55, 16 42, 17 26 C 18 15, 22 7, 26 4 C 30 7, 27 16, 26 28 C 25 41, 31 50, 39 53 Z";
const COATI_PATAS =
  "M37 73 C 35 79, 34 85, 34 90 L 40 90 C 40 84, 41 78, 43 74 Z M48 75 C 47 80, 46 85, 46 90 L 52 90 C 52 85, 52 80, 53 75 Z M62 75 C 61 80, 60 85, 60 90 L 66 90 C 66 85, 66 80, 67 74 Z M70 72 C 70 78, 70 84, 70 90 L 76 90 C 76 84, 75 78, 75 71 Z";
const COATI_ANILLOS = "M20 41 L 28 43 M19 31 L 27 33 M20 22 L 28 24 M22 13 L 29 15";

// Bambú (tacuara): dos cañas segmentadas por nudos + hojas lanceoladas. Es
// una figura vertical, pensada para vivir en los márgenes de sección.
const BAMBU_CANAS =
  "M40 3 H53 V23 H40 Z M40 27 H53 V47 H40 Z M40 51 H53 V71 H40 Z M40 75 H53 V100 H40 Z M60 16 H69 V35 H60 Z M60 39 H69 V58 H60 Z M60 62 H69 V81 H60 Z M60 85 H69 V100 H60 Z";
const BAMBU_HOJAS =
  "M40 26 C 30 21, 18 22, 11 29 C 20 34, 33 32, 40 27 Z M40 51 C 31 49, 21 53, 16 61 C 26 62, 36 57, 41 52 Z M69 38 C 78 32, 90 33, 95 40 C 86 45, 74 43, 69 39 Z M53 13 C 61 6, 73 5, 79 10 C 71 16, 59 17, 53 14 Z";

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
  if (kind === "coati") {
    return (
      <>
        <path d={COATI_COLA} />
        <path d={COATI_PATAS} />
        <path d={COATI_CUERPO} />
        <path d={COATI_CABEZA} />
        <path d={COATI_ANILLOS} fill="none" stroke="currentColor" strokeWidth="1.4" />
      </>
    );
  }
  return (
    <>
      <path d={BAMBU_CANAS} />
      <path d={BAMBU_HOJAS} />
    </>
  );
}

// Figura selvática decorativa que arranca como contorno vacío y se "llena" de
// color sólido de abajo hacia arriba a medida que la sección entra en el
// viewport (scrub). Va POR DETRÁS del contenido: z-0, mientras los
// contenedores de sección están en z-[1]. Colocarla dentro de una
// <section class="relative"> en una zona de aire (padding/margen) para que no
// cruce texto ni imágenes. REGLA: offset + size tiene que entrar en el padding
// vertical de la sección (top-N + size <= padding-top, ídem abajo). Apoyarse en
// el margen horizontal no alcanza: con max-w + px-12 el aire lateral se come
// entero entre md y lg y la figura termina encima del kicker.
// `data-selva-figure` la ancla al trazado de SelvaTrail, que conecta todas las
// figuras.
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
        {/* opacity en el <g> y no stroke/fill-opacity por path: las figuras se
            arman con partes superpuestas (cuerpo, patas, cola…) y la opacidad
            por elemento las compone dos veces, marcando costuras */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          opacity={0.45}
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
          <g fill="currentColor" opacity={0.88} stroke="none">
            <Figure kind={kind} />
          </g>
        </svg>
      </div>
    </div>
  );
}
