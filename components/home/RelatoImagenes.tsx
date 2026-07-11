"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Reveal } from "@/components/motion/Reveal";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { SelvaFigure } from "@/components/motion/SelvaFigure";
import { GalleryLightbox, type GalleryItem } from "./GalleryLightbox";

/**
 * Relato en imágenes — grilla bento compacta con las diez fotos reales del
 * bucket "Aruma-fotos/Complejo". Todas visibles; cada tile abre el lightbox
 * en su índice. El orden de PHOTOS es el orden narrativo (numeración 01–10).
 */
const PHOTOS: GalleryItem[] = [
  { label: "La llegada", photo: "Complejo/5.jpg" },          // 0 · pileta + dracaena
  { label: "El descenso", photo: "Complejo/16.jpg" },        // 1 · escalera otoñal
  { label: "El agua", photo: "Complejo/7.jpg" },             // 2 · borde ocre (H)
  { label: "El refugio", photo: "Complejo/10.jpg" },         // 3 · cabaña A-frame
  { label: "La selva alrededor", photo: "Complejo/4.jpg" },  // 4 · orquídeas + arce
  { label: "Iris de la selva", photo: "Complejo/2.jpg" },    // 5 · iris con rocío
  { label: "Heliconia", photo: "Complejo/1.jpg" },           // 6 · pinza de langosta
  { label: "Adentro", photo: "Complejo/23 (1).jpg" },        // 7 · esferas / bronce (H)
  { label: "El descanso", photo: "Complejo/13.jpg" },        // 8 · bacha + espejo
  { label: "Cada rincón", photo: "Complejo/17a.png" },       // 9 · cuadro floral
];

/** Tiles de la grilla (orden = colocación en el grid). `at` apunta a PHOTOS. */
const TILES: { key: string; at: number; span: string; pos?: string }[] = [
  { key: "agua", at: 2, span: "col-span-2 row-span-1 md:row-span-2" },          // hero H
  { key: "llegada", at: 0, span: "col-span-1 row-span-2", pos: "50% 45%" },     // tall V
  { key: "refugio", at: 3, span: "col-span-1 row-span-2", pos: "50% 22%" },     // tall V
  { key: "descenso", at: 1, span: "col-span-1 row-span-1", pos: "50% 62%" },
  { key: "selva", at: 4, span: "col-span-1 row-span-1", pos: "50% 30%" },
  { key: "iris", at: 5, span: "col-span-1 row-span-1", pos: "50% 52%" },
  { key: "heliconia", at: 6, span: "col-span-1 row-span-1", pos: "50% 42%" },
  { key: "adentro", at: 7, span: "col-span-2 row-span-1" },                     // H
  { key: "descanso", at: 8, span: "col-span-1 row-span-1", pos: "50% 40%" },
  { key: "rincon", at: 9, span: "col-span-1 row-span-1", pos: "50% 45%" },
];

export function RelatoImagenes() {
  const t = useTranslations("galeria");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <section id="galeria" className="relative bg-arena py-16 md:py-[110px] overflow-hidden">
      <SelvaFigure kind="tucan" className="top-14 left-[4%]" size={130} flip />

      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-5 mb-9 md:mb-[48px]">
          <div className="max-w-[560px]">
            <Reveal>
              <Kicker>{t("kicker")}</Kicker>
            </Reveal>
            <RevealTitle delay={0.08}>
              <h2
                className="font-display font-normal tracking-[-0.01em]"
                style={{ fontSize: "clamp(30px,4.4vw,52px)", margin: "14px 0 0" }}
              >
                {t("title")}
              </h2>
            </RevealTitle>
          </div>
          <Reveal delay={0.14}>
            <button
              type="button"
              onClick={() => openAt(0)}
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-carbon transition-colors duration-300 hover:text-terracota"
            >
              {t("viewFull")}
              <span aria-hidden>→</span>
            </button>
          </Reveal>
        </div>

        {/* Grilla bento: 2 col mobile, 4 col desktop — las 10 fotos visibles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-[14px] [grid-auto-rows:150px] md:[grid-auto-rows:208px]">
          {TILES.map((tile, i) => (
            <Reveal key={tile.key} delay={0.04 + i * 0.04} className={`${tile.span} h-full`}>
              <button
                type="button"
                onClick={() => openAt(tile.at)}
                aria-label={PHOTOS[tile.at].label}
                className="group relative block h-full w-full overflow-hidden rounded-[6px] cursor-zoom-in"
                style={{ background: "#d8cfbf" }}
              >
                <ImageSlot
                  label={PHOTOS[tile.at].label}
                  photo={PHOTOS[tile.at].photo}
                  position={tile.pos}
                  className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-[1.04]"
                />

                {/* Número (orden narrativo) — siempre visible */}
                <span className="pointer-events-none absolute top-3 left-4 text-[11px] tracking-[0.2em] text-marfil/85 [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
                  {String(tile.at + 1).padStart(2, "0")}
                </span>

                {/* Epígrafe: visible en mobile, aparece al hover en desktop */}
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pt-12 pb-3.5 text-left md:translate-y-2 md:opacity-0 transition-all duration-500 ease-out md:group-hover:translate-y-0 md:group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(to top, rgba(20,18,14,.68), rgba(20,18,14,0))",
                  }}
                >
                  <span className="block font-display text-[17px] leading-tight text-marfil">
                    {t(`relato.frames.${tile.key}.t`)}
                  </span>
                  <span className="mt-0.5 hidden md:block text-[12px] font-light leading-snug text-marfil/75">
                    {t(`relato.frames.${tile.key}.c`)}
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      <GalleryLightbox
        items={PHOTOS}
        open={open}
        index={index}
        onClose={() => setOpen(false)}
        onIndex={setIndex}
      />
    </section>
  );
}
