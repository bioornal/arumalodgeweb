import { useTranslations } from "next-intl";
import { KenBurns } from "@/components/motion/KenBurns";
import { HeroReveal } from "@/components/motion/HeroReveal";
import { HeroScrollFade } from "@/components/motion/HeroScrollFade";
import { ScrollCue } from "@/components/home/ScrollCue";

const HERO_IMAGE =
  "https://res.cloudinary.com/djtvjkcu6/image/upload/f_auto,q_auto,w_1920/v1781879164/ArumaLodge/Hero_bgsjtf.png";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <header
      id="top"
      className="relative overflow-hidden h-[74svh] max-h-[680px] min-h-[520px] md:h-[94vh] md:max-h-none md:min-h-[min(640px,100svh)]"
      style={{
        background: "linear-gradient(165deg,#23362B 0%,#1D1D1D 70%,#171717 100%)",
      }}
    >
      {/* Media layer with Ken Burns */}
      <div className="absolute" style={{ inset: "-8%" }}>
        <KenBurns className="block h-full w-full">
          <div className="relative h-full w-full overflow-hidden">
            <img
              src={HERO_IMAGE}
              alt={t("title")}
              className="absolute inset-0 h-full w-full object-cover object-[20%_58%] md:object-center [filter:saturate(1.08)_contrast(1.03)]"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
          </div>
        </KenBurns>
      </div>

      {/* Warm sunset glow — en mobile el sol queda arriba a la izquierda del encuadre */}
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background:
            "radial-gradient(130% 85% at 18% 12%,rgba(180,95,50,.42) 0%,rgba(160,75,42,0) 52%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            "radial-gradient(120% 80% at 78% 8%,rgba(160,75,42,.34) 0%,rgba(160,75,42,0) 46%)",
        }}
      />

      {/* Legibility scrim */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(20,20,20,.5) 0%,rgba(20,20,20,.05) 32%,rgba(20,20,20,.18) 60%,rgba(20,20,20,.72) 100%)",
        }}
      />

      {/* Content */}
      <div className="pointer-events-none relative z-[3] mx-auto flex h-full max-w-[1240px] flex-col items-center justify-end text-center px-5 md:px-12"
        style={{ paddingBottom: "clamp(96px, 18vh, 132px)" }}
      >
        <HeroScrollFade>
        <HeroReveal>
          {/* Hero kicker — arena color, wider tracking (not the bronce <Kicker>) */}
          <div
            className="font-sans text-[11px] md:text-[13px] uppercase"
            style={{ letterSpacing: "0.42em", color: "#E8E1D5" }}
          >
            {t("kicker")}
          </div>

          {/* H1 */}
          <h1
            className="font-display font-normal leading-[1.0] text-marfil tracking-[-0.01em]"
            style={{
              fontSize: "clamp(42px,8vw,112px)",
              margin: "18px 0 0",
              maxWidth: "14ch",
            }}
          >
            {t("title")}
          </h1>

          {/* Subtitle */}
          <p
            className="font-display italic font-light"
            style={{
              fontSize: "clamp(16px,2.1vw,24px)",
              color: "#E8E1D5",
              margin: "22px 0 0",
            }}
          >
            {t("subtitle")}
          </p>
        </HeroReveal>
        </HeroScrollFade>
      </div>

      {/* Scroll cue */}
      <ScrollCue />
    </header>
  );
}
