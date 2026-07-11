import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { Reveal } from "@/components/motion/Reveal";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { SelvaFigure } from "@/components/motion/SelvaFigure";

export function Manifiesto() {
  const t = useTranslations("manifiesto");

  return (
    <section id="marca" className="relative bg-marfil py-16 md:py-[140px]">
      <SelvaFigure kind="mariposa" className="top-14 right-[5%]" size={110} />
      <div className="relative z-[1] mx-auto max-w-[1240px] px-5 md:px-12">
        <Reveal>
          <Kicker>{t("kicker")}</Kicker>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-10 md:gap-16 mt-8 md:mt-10 items-end">
          <RevealTitle delay={0.08}>
            <h2
              className="font-display m-0 font-normal leading-[1.08] tracking-[-0.01em] text-carbon"
              style={{ fontSize: "clamp(30px,4.6vw,60px)" }}
            >
              {t("title")}
            </h2>
          </RevealTitle>

          <Reveal delay={0.18}>
            <p className="m-0 text-[16px] font-light leading-[1.75] text-cuerpo">
              {t("body")}
            </p>
            <a
              href="#marca"
              className="mt-[28px] inline-flex items-center gap-[9px] border-b border-[#d8b9a8] pb-[5px] text-[13px] uppercase tracking-[.08em] text-terracota no-underline transition-[gap,border-color] duration-300 hover:gap-[16px] hover:border-terracota"
            >
              {t("link")}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
