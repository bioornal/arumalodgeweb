import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Reveal } from "@/components/motion/Reveal";
import { RevealTitle } from "@/components/motion/RevealTitle";
import { Parallax } from "@/components/motion/Parallax";
import { SelvaFigure } from "@/components/motion/SelvaFigure";

export function Experiencias() {
  const t = useTranslations("experiencias");

  const items = [
    { key: "nature" as const, num: "01" },
    { key: "gastronomy" as const, num: "02" },
    { key: "frontier" as const, num: "03" },
    { key: "activities" as const, num: "04" },
  ];

  return (
    <section
      id="experiencias"
      className="bg-selva text-[#E8E1D5] relative py-16 md:py-[140px] overflow-hidden"
    >
      <SelvaFigure kind="mariposa" color="#E8E1D5" className="bottom-12 right-[4%]" size={90} flip />
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-10 md:gap-[72px] items-center">
          {/* Left: feature image with parallax — vista aérea de las Cataratas */}
          <Reveal className="order-1">
            <div className="overflow-hidden rounded-[3px] h-[400px] md:h-[560px]" style={{ background: "#2c4034" }}>
              <Parallax speed={-40}>
                <ImageSlot
                  label="Cataratas del Iguazú desde el aire"
                  photo="Iguazu_Cataratas2.jpg"
                  className="h-[480px] md:h-[640px] w-full"
                />
              </Parallax>
            </div>
          </Reveal>

          {/* Right: copy + items */}
          <div className="order-2">
            <Reveal delay={0.08}>
              <Kicker>{t("kicker")}</Kicker>
            </Reveal>

            <RevealTitle delay={0.14}>
              <h2
                className="font-display font-normal leading-[1.05] tracking-[-0.01em] text-marfil"
                style={{
                  fontSize: "clamp(30px,4.4vw,58px)",
                  margin: "18px 0 0",
                }}
              >
                {t("title")}
              </h2>
            </RevealTitle>

            <Reveal delay={0.2}>
              <p
                className="font-light"
                style={{
                  fontSize: 16,
                  lineHeight: 1.8,
                  color: "#cdd3c8",
                  margin: "26px 0 40px",
                  maxWidth: "46ch",
                }}
              >
                {t("body")}
              </p>
            </Reveal>

            <Reveal delay={0.26}>
              <div>
                {items.map(({ key, num }, idx) => (
                  <div
                    key={key}
                    className="group flex justify-between items-start gap-4 transition-colors duration-300 hover:bg-[#2c4034]"
                    style={{
                      padding: "18px 18px",
                      margin: "0 -18px",
                      borderTop: "1px solid #3a4d40",
                      ...(idx === items.length - 1
                        ? { borderBottom: "1px solid #3a4d40" }
                        : {}),
                    }}
                  >
                    <div>
                      <span
                        className="font-display block transition-colors duration-300 group-hover:text-terracota"
                        style={{ fontSize: 22, color: "#F8F5F0" }}
                      >
                        {t(`items.${key}.title`)}
                      </span>
                      <span
                        className="font-light block"
                        style={{ fontSize: 13.5, lineHeight: 1.6, color: "#a9b6a4", marginTop: 6, maxWidth: "38ch" }}
                      >
                        {t(`items.${key}.desc`)}
                      </span>
                    </div>
                    <span className="text-[13px] text-[#8fa091] transition-colors duration-300 group-hover:text-terracota shrink-0">
                      {num}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
