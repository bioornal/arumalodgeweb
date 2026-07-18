import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Reveal } from "@/components/motion/Reveal";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { Parallax } from "@/components/motion/Parallax";
import { SelvaFigure } from "@/components/motion/SelvaFigure";

/**
 * Experiencias — banda cinematográfica full-bleed.
 * La vista aérea de la Garganta (única foto real del destino en el bucket)
 * es la protagonista en su formato panorámico natural, con parallax sutil;
 * los 4 ítems van en una tira editorial debajo, sin competir con la imagen.
 */
const ITEMS = [
  { key: "nature", num: "01" },
  { key: "gastronomy", num: "02" },
  { key: "frontier", num: "03" },
  { key: "activities", num: "04" },
] as const;

export function Experiencias() {
  const t = useTranslations("experiencias");

  return (
    <section
      id="experiencias"
      className="bg-selva text-[#E8E1D5] relative py-16 md:py-[110px] overflow-hidden"
    >
      <SelvaFigure kind="mariposa" color="#E8E1D5" className="top-16 right-[4%]" size={90} flip />

      {/* Header editorial: kicker + título a la izquierda, bajada a la derecha */}
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        <Reveal>
          <Kicker>{t("kicker")}</Kicker>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-8 md:gap-16 mt-6 md:mt-8 items-end">
          <RevealTitle delay={0.08}>
            <h2
              className="font-display font-normal leading-[1.05] tracking-[-0.01em] text-marfil m-0"
              style={{ fontSize: "clamp(30px,4.4vw,58px)" }}
            >
              {t("title")}
            </h2>
          </RevealTitle>
          <Reveal delay={0.16}>
            <p
              className="font-light m-0"
              style={{ fontSize: 16, lineHeight: 1.8, color: "#cdd3c8", maxWidth: "44ch" }}
            >
              {t("body")}
            </p>
          </Reveal>
        </div>
      </div>

      {/* Banda full-bleed: la Garganta en su formato panorámico natural.
          El wrapper lleva relative z-[1] para que la foto opaca cubra al
          SelvaTrail (la línea del scroll pasa por detrás, como en el resto
          de las secciones con imagen). */}
      <Reveal delay={0.1} className="relative z-[1] mt-10 md:mt-[64px]">
        <div
          className="relative h-[300px] md:h-[56vh] md:min-h-[380px] md:max-h-[600px] overflow-hidden"
          style={{ background: "#2c4034" }}
        >
          {/* Imagen 80px más alta que la banda: margen para el recorrido del parallax */}
          <Parallax speed={-40} className="absolute inset-x-0 top-0 h-[calc(100%+80px)]">
            <ImageSlot
              label="Cataratas del Iguazú desde el aire"
              photo="Iguazu_Cataratas2.jpg"
              position="50% 38%"
              className="h-full w-full"
            />
          </Parallax>

          {/* Scrim + caption anclado al container */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 pt-20"
            style={{ background: "linear-gradient(to top, rgba(20,18,14,.55), rgba(20,18,14,0))" }}
          >
            <div className="mx-auto max-w-[1320px] px-5 md:px-12 pb-4 md:pb-5">
              <span className="text-[11px] uppercase tracking-[0.22em] text-marfil/90 [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
                {t("caption")}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Tira de ítems: numeración + título + bajada, hover terracota */}
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12 mt-10 md:mt-[56px]">
        <Reveal delay={0.12}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-9">
            {ITEMS.map(({ key, num }) => (
              <div key={key} className="group border-t border-[#3a4d40] pt-5">
                <span className="text-[12px] tracking-[0.2em] text-[#8fa091] transition-colors duration-300 group-hover:text-terracota">
                  {num}
                </span>
                <span className="font-display block text-[21px] text-[#F8F5F0] mt-3 transition-colors duration-300 group-hover:text-terracota">
                  {t(`items.${key}.title`)}
                </span>
                <span
                  className="font-light block mt-2"
                  style={{ fontSize: 13.5, lineHeight: 1.6, color: "#a9b6a4" }}
                >
                  {t(`items.${key}.desc`)}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
