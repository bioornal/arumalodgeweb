"use client";
import { useEffect } from "react";

/** Clave en localStorage: timestamp de cuándo se degradó (TTL 24h). */
export const FX_OFF_KEY = "aruma-fx-off";

// Umbral y ventanas del muestreo. El warmup saltea el pico de hidratación
// (ahí hasta una máquina sana tiene frames largos); recién después se mide.
const MIN_FPS = 24;
const WARMUP_MS = 600;
const SAMPLE_MS = 1800;
// Deadman: si para entonces la muestra no terminó, rAF está muerto o casi
// (freeze duro con el compositor colgado) y se degrada sin esperar veredicto.
// Los setTimeout siguen corriendo aunque el pintado esté clavado.
const DEADMAN_MS = 4000;

/**
 * Auto-degradado de efectos: mide los FPS reales al cargar y, si la máquina
 * no llega a MIN_FPS (o el deadman vence sin muestra completa), degrada EN
 * VIVO: data-fx="" + evento aruma:fx-degrade, sin recargar. Además graba
 * FX_OFF_KEY, que el script inline del layout lee ANTES de hidratar en las
 * cargas siguientes para arrancar con data-fx="" (mismo mecanismo de
 * ?sinfx=1) y que los efectos ni lleguen a montarse. El flag vence a las
 * 24h para que una máquina que tuvo un mal día recupere los efectos sola.
 *
 * No corre si data-fx ya está presente (modo diagnóstico por URL, o ya
 * degradado: sin efectos los FPS no dicen nada) ni con reduced motion. La
 * medición se aborta si la pestaña pasa a segundo plano, porque el navegador
 * throttlea rAF en tabs ocultos y eso daría un falso positivo.
 */
export function FxWatchdog() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.fx !== undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.hidden) return;

    let stopped = false;
    let raf = 0;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Alivio inmediato SIN recargar: un reload en plena agonía duplica el
    // costo de carga justo cuando la máquina no da más (así se pasaba de
    // "tirón" a freeze duro). data-fx="" apaga grano + animaciones y
    // transiciones CSS al instante (reglas en globals.css) y el evento hace
    // que Lenis se destruya; los scrubs GSAP ya montados siguen, pero la
    // próxima carga nace liviana gracias al flag persistido.
    const degrade = () => {
      stop();
      try {
        localStorage.setItem(FX_OFF_KEY, String(Date.now()));
      } catch {
        // sin storage no persiste, pero el alivio en vivo vale igual
      }
      html.dataset.fx = "";
      window.dispatchEvent(new Event("aruma:fx-degrade"));
    };

    let start = -1;
    let frames = 0;
    let deadman = 0;
    const loop = (ts: number) => {
      if (stopped) return;
      if (start < 0) {
        start = ts; // frame ancla: los intervalos se miden desde acá
      } else {
        frames++;
        const elapsed = ts - start;
        if (elapsed >= SAMPLE_MS) {
          stop(); // muestra completa: desarma el deadman antes del veredicto
          if ((frames * 1000) / elapsed < MIN_FPS) degrade();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const warmup = window.setTimeout(() => {
      if (stopped || document.hidden) return;
      raf = requestAnimationFrame(loop);
      deadman = window.setTimeout(() => {
        if (!stopped) degrade();
      }, DEADMAN_MS);
    }, WARMUP_MS);

    return () => {
      stop();
      window.clearTimeout(warmup);
      window.clearTimeout(deadman);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
