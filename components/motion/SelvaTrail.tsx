"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { fxDisabled } from "@/lib/fx";

gsap.registerPlugin(ScrollTrigger);

const BRONCE = "#9A7B4F";
const TERRACOTA = "#A04B2A";

type Pt = { x: number; y: number };

// Curva suave (Catmull-Rom → Bézier) que pasa por todos los puntos. Los
// puntos de control se limitan a [minX, maxX]: sin esto, tramos con mucho
// desplazamiento lateral generan controles fuera del viewport y la curva
// hace barridos horizontales exagerados.
function smoothThrough(pts: Pt[], minX: number, maxX: number) {
  if (pts.length < 2) return "";
  const cx = (x: number) => Math.min(maxX, Math.max(minX, x));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = cx(p1.x + (p2.x - p0.x) / 6);
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = cx(p2.x - (p3.x - p1.x) / 6);
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Línea que CONECTA las figuras selváticas ([data-selva-figure]) y se va
// llenando de terracota sólido a medida que se scrollea. Siempre queda POR
// DEBAJO del contenido: va en z-[1] pero primero en el DOM dentro de
// <main class="relative">, y todo el copy/imágenes de sección vive en
// contenedores `relative z-[1]` posteriores (SearchWidget en z-20). El
// trazado une los centros de figura con UNA curva larga y continua (un punto
// medio por tramo, sin ir a los márgenes) y esquiva de cerca los bloques de
// copy reales: se miden sus rects y los puntos que caen dentro se corren
// apenas hasta el borde. La punta pintada acompaña el CENTRO del viewport
// (lookup largo→y del path). Se mide en cliente y se regenera en resize/load.
// El scrub corre SIEMPRE (también con prefers-reduced-motion): no es
// animación autónoma, la conduce el scroll.
export function SelvaTrail() {
  const svgRef = useRef<SVGSVGElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      if (fxDisabled()) return;
      const svg = svgRef.current;
      const track = trackRef.current;
      const progress = progressRef.current;
      const main = svg?.closest("main");
      if (!svg || !track || !progress || !main) return;
      if (typeof progress.getTotalLength !== "function") return; // jsdom

      let total = 0;
      let mainTopAbs = 0;
      let mainH = 0;
      // Muestras (largo, maxY) a lo largo del path: y forzada a monótona para
      // poder buscar "qué largo del trazo llega hasta esta altura"
      let lookup: { s: number; y: number }[] = [];

      const buildLookup = () => {
        lookup = [];
        if (typeof progress.getPointAtLength !== "function") return;
        const N = 240;
        let maxY = -Infinity;
        for (let i = 0; i <= N; i++) {
          const s = (total * i) / N;
          const p = progress.getPointAtLength(s);
          maxY = Math.max(maxY, p.y);
          lookup.push({ s, y: maxY });
        }
      };

      const lengthAtY = (y: number) => {
        if (!lookup.length) return 0;
        if (y <= lookup[0].y) return 0;
        if (y >= lookup[lookup.length - 1].y) return total;
        let lo = 0;
        let hi = lookup.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (lookup[mid].y < y) lo = mid + 1;
          else hi = mid;
        }
        const a = lookup[lo - 1];
        const b = lookup[lo];
        const t = (y - a.y) / (b.y - a.y || 1);
        return a.s + t * (b.s - a.s);
      };

      const build = () => {
        const rectM = main.getBoundingClientRect();
        const W = main.clientWidth;
        const H = main.scrollHeight;
        mainTopAbs = rectM.top + window.scrollY;
        mainH = H;
        const figs = Array.from(
          document.querySelectorAll<HTMLElement>("[data-selva-figure]"),
        )
          .map((f) => {
            const r = f.getBoundingClientRect();
            if (r.width === 0) return null;
            const sec = f.closest("section");
            if (!(sec instanceof HTMLElement)) return null;
            return {
              x: r.left - rectM.left + r.width / 2,
              y: r.top - rectM.top + r.height / 2,
              secTop: sec.offsetTop,
            };
          })
          .filter((p): p is Pt & { secTop: number } => p !== null)
          .sort((a, b) => a.y - b.y);
        if (W < 200 || figs.length < 2) return false;

        // Trazado base: diagonales suaves de figura a figura (un punto medio
        // por tramo). Nada de ir a los márgenes ni de cruces encajonados —
        // la armonía sale de curvas largas y continuas.
        type BPt = Pt & { fixed?: boolean };
        const base: BPt[] = [];
        base.push({ x: figs[0].x, y: figs[0].secTop + 16, fixed: true });
        figs.forEach((f, i) => {
          base.push({ x: f.x, y: f.y, fixed: true });
          const next = figs[i + 1];
          if (next) {
            base.push({ x: (f.x + next.x) / 2, y: (f.y + next.y) / 2 });
          } else {
            const contacto = document.getElementById("contacto");
            if (contacto) {
              const endX = W * 0.5;
              const endY = contacto.offsetTop + 60;
              base.push({ x: (f.x + endX) / 2, y: (f.y + endY) / 2 });
              base.push({ x: endX, y: endY, fixed: true });
            }
          }
        });

        // Densifica el trazado (un punto cada ~60px de bajada, menos que el
        // alto de cualquier bloque de texto expandido) para poder desviarlo
        // localmente sin deformar el resto de la curva.
        const pts: BPt[] = [];
        for (let i = 0; i < base.length - 1; i++) {
          const a = base[i];
          const b = base[i + 1];
          pts.push(a);
          const steps = Math.floor((b.y - a.y) / 60);
          for (let s = 1; s < steps; s++) {
            const t = s / steps;
            pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
          }
        }
        pts.push(base[base.length - 1]);

        // Esquiva DE CERCA los textos principales: mide los bloques de copy
        // reales y corre los puntos que caen dentro apenas hasta su borde
        // (más un aire de ~36px), del lado que menos desvía la curva.
        // Textos dentro de tarjetas de media (overflow-hidden CON imagen) no
        // se esquivan: la línea pasa por detrás de la foto opaca y no se ve.
        // Ojo: exigir la <img> — RevealTitle también envuelve títulos en un
        // overflow-hidden (máscara de animación) y esos SÍ deben esquivarse.
        const inMediaCard = (el: HTMLElement) => {
          const sec = el.closest("section");
          let n = el.parentElement;
          while (n && n !== sec) {
            if (n.classList.contains("overflow-hidden") && n.querySelector("img")) return true;
            n = n.parentElement;
          }
          return false;
        };
        const avoidRects = Array.from(
          main.querySelectorAll<HTMLElement>("section h1, section h2, section h3, section p"),
        )
          .filter((el) => !inMediaCard(el))
          .map((el) => {
            const r = el.getBoundingClientRect();
            if (r.width < 40 || r.height < 12) return null;
            return {
              left: r.left - rectM.left - 36,
              right: r.right - rectM.left + 36,
              top: r.top - rectM.top - 28,
              bottom: r.bottom - rectM.top + 28,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        avoidRects.forEach((rect) => {
          const inside = pts.filter(
            (p) =>
              !p.fixed &&
              p.y > rect.top &&
              p.y < rect.bottom &&
              p.x > rect.left &&
              p.x < rect.right,
          );
          if (!inside.length) return;
          // Un solo lado por bloque (el más cercano al paso natural de la
          // curva) para que no haya zigzags
          const avgX = inside.reduce((acc, p) => acc + p.x, 0) / inside.length;
          const goLeft = avgX < (rect.left + rect.right) / 2;
          const edge = goLeft ? rect.left : rect.right;
          inside.forEach((p) => {
            p.x = goLeft ? Math.min(p.x, edge) : Math.max(p.x, edge);
            p.x = Math.min(W - 20, Math.max(20, p.x));
          });
          // Feathering: los puntos justo antes/después del bloque se acercan
          // a medias al borde, para que la curva suavizada llegue alineada y
          // no corte la esquina del rect
          pts.forEach((p) => {
            if (p.fixed) return;
            const nearBand =
              (p.y > rect.top - 80 && p.y <= rect.top) ||
              (p.y >= rect.bottom && p.y < rect.bottom + 80);
            if (!nearBand) return;
            const blended = (p.x + edge) / 2;
            p.x = goLeft ? Math.min(p.x, blended) : Math.max(p.x, blended);
            p.x = Math.min(W - 20, Math.max(20, p.x));
          });
        });

        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        const d = smoothThrough(pts, 16, W - 16);
        track.setAttribute("d", d);
        progress.setAttribute("d", d);
        total = progress.getTotalLength();
        progress.style.strokeDasharray = String(total);
        progress.style.strokeDashoffset = String(total);
        buildLookup();
        return true;
      };

      if (!build()) return;

      // Se cuantiza a 1px y solo se escribe cuando cambia: cada escritura de
      // strokeDashoffset invalida el repintado del SVG (que abarca toda la
      // página), así que las escrituras redundantes por frame salen caras.
      let lastOffset = -1;
      ScrollTrigger.create({
        trigger: main,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (self) => {
          // La punta pintada acompaña el CENTRO del viewport (no el borde
          // superior): se busca qué largo del trazo alcanza esa altura
          const vh = window.innerHeight;
          const scroll = mainTopAbs + self.progress * (mainH - vh);
          const targetY = scroll + vh * 0.52 - mainTopAbs;
          const offset = Math.round(total - lengthAtY(targetY));
          if (offset === lastOffset) return;
          lastOffset = offset;
          progress.style.strokeDashoffset = String(offset);
        },
      });

      let timer: number | undefined;
      const rebuild = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (build()) ScrollTrigger.refresh();
        }, 250);
      };
      window.addEventListener("resize", rebuild);
      window.addEventListener("load", rebuild);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("resize", rebuild);
        window.removeEventListener("load", rebuild);
      };
    },
    { scope: svgRef },
  );

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full md:block"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path ref={trackRef} fill="none" stroke={BRONCE} strokeOpacity={0.16} strokeWidth={1.2} />
      <path
        ref={progressRef}
        data-trail-progress
        fill="none"
        stroke={TERRACOTA}
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
