import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Reveal } from "@/components/motion/Reveal";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { Parallax } from "@/components/motion/Parallax";
import { SelvaFigure } from "@/components/motion/SelvaFigure";
import { Link } from "@/lib/i18n/navigation";
import { UNITS } from "@/lib/units";
import type { UnitSlug } from "@/lib/units";

export function UnitsGrid() {
  const t = useTranslations("units");

  return (
    <section id="departamentos" className="relative bg-arena-clara py-16 md:py-[130px]">
      <SelvaFigure kind="hoja" className="bottom-8 left-[3%] -rotate-12" size={150} />
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        {/* Section header */}
        <div className="mb-[44px] md:mb-[60px] flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <Kicker>{t("sectionKicker")}</Kicker>
            </Reveal>
            <RevealTitle delay={0.08}>
              <h2
                className="font-display mt-4 font-normal leading-[1.05] tracking-[-0.01em] text-carbon"
                style={{ fontSize: "clamp(28px,4vw,52px)" }}
              >
                {t("sectionTitle")}
              </h2>
            </RevealTitle>
          </div>

          <Reveal delay={0.12}>
            <a
              href="#departamentos"
              className="inline-flex items-center gap-[9px] self-end border-b border-[#c9bfae] pb-[5px] text-[13px] uppercase tracking-[.08em] text-carbon no-underline transition-[gap] duration-300 hover:gap-[16px]"
            >
              {t("viewAll")}
            </a>
          </Reveal>
        </div>

        {/* Units grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-[30px]">
          {UNITS.map((unit, i) => {
            const slug = unit.slug as UnitSlug;
            return (
              <Reveal key={slug} delay={i * 0.11}>
                <Link
                  href={`/departamentos/${slug}`}
                  className="group block text-inherit no-underline transition-transform duration-500 ease-[cubic-bezier(.16,.84,.44,1)] hover:-translate-y-2"
                >
                  {/* Image */}
                  <div className="overflow-hidden rounded-[3px] bg-slot h-[300px] sm:h-[380px] lg:h-[420px]">
                    <Parallax speed={-16}>
                      <ImageSlot
                        label={t(`${slug}.name` as `${UnitSlug}.name`)}
                        className="h-[316px] sm:h-[396px] lg:h-[436px] w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-105"
                      />
                    </Parallax>
                  </div>

                  {/* Name + price row */}
                  <div className="mt-5 flex items-baseline justify-between gap-3">
                    <h3 className="font-display m-0 font-medium text-[24px] md:text-[27px] text-carbon">
                      {t(`${slug}.name` as `${UnitSlug}.name`)}
                    </h3>
                    <span className="shrink-0 text-[13px] text-bronce">
                      {t("fromPrice")}
                    </span>
                  </div>

                  {/* Sub info */}
                  <div className="mt-2 text-[13px] tracking-[.02em] text-muted">
                    {t(`${slug}.sub` as `${UnitSlug}.sub`)}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
