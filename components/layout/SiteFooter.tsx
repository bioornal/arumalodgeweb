import Link from "next/link";
import { useTranslations } from "next-intl";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { Link as IntlLink } from "@/lib/i18n/navigation";

// Logo oficial (Cloudinary). En el footer va monocromo en tono marfil
// cálido (brightness-0 + invert + sepia) porque el original es verde oscuro
// sobre transparente y no se leería en el fondo carbón.
const LOGO_URL =
  "https://res.cloudinary.com/djtvjkcu6/image/upload/f_auto,q_auto,w_320/v1783166702/ArumaLodge/ALARGADA_vs5bwo.png";
const LOGO_LIGHT_FILTER =
  "brightness(0) invert(1) sepia(0.22) saturate(0.55)";

export function SiteFooter() {
  const tf = useTranslations("footer");
  const tn = useTranslations("nav");
  const tc = useTranslations("contacto");

  return (
    <footer className="bg-carbon text-arena pt-16 md:pt-[90px] pb-9">
      <div className="max-w-[1320px] mx-auto px-5 md:px-12">
        {/* Top grid — responsive */}
        <div
          className="grid gap-10 md:gap-12 pb-12 md:pb-16 border-b border-[#34302b] grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"
        >
          {/* 1. Brand — full width on mobile */}
          <div className="col-span-2 lg:col-span-1">
            <img
              src={LOGO_URL}
              alt="Aruma Lodge"
              className="h-24 md:h-28 w-auto"
              style={{ filter: LOGO_LIGHT_FILTER }}
            />
            <p className="text-[14px] leading-[1.7] font-light text-[#a39d92] mt-[22px] max-w-[34ch]">
              {tf("tagline")}
            </p>
          </div>

          {/* 2. Explorar */}
          <div>
            <div className="text-[11px] uppercase tracking-[.22em] text-bronce mb-5">
              {tf("exploreTitle")}
            </div>
            <div className="flex flex-col gap-[13px] text-[14px]">
              <a
                href="#departamentos"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("brand")}
              </a>
              <a
                href="#departamentos"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("apartments")}
              </a>
              <a
                href="#experiencias"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("experiences")}
              </a>
              <a
                href="#galeria"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tn("gallery")}
              </a>
            </div>
          </div>

          {/* 3. Contacto */}
          <div>
            <div className="text-[11px] uppercase tracking-[.22em] text-bronce mb-5">
              {tf("contactTitle")}
            </div>
            <div className="flex flex-col gap-[13px] text-[14px]">
              <IntlLink
                href="/mi-reserva"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tf("myReservation")}
              </IntlLink>
              <a
                href="#contacto"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                WhatsApp
              </a>
              <a
                href="mailto:arumalodge.iguazu@gmail.com"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                arumalodge.iguazu@gmail.com
              </a>
              <a
                href="#contacto"
                className="text-[#cfc8bc] no-underline transition-colors duration-[250ms] hover:text-marfil"
              >
                {tc("address")}
              </a>
            </div>
          </div>

          {/* 4. Idioma */}
          <div>
            <div className="text-[11px] uppercase tracking-[.22em] text-bronce mb-5">
              {tf("langTitle")}
            </div>
            <LangSwitcher variant="dark" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-center flex-wrap gap-[14px] pt-7 text-[12px] text-[#7d776d] tracking-[.04em]">
          <span>
            <Link
              href="/admin/login"
              aria-label="Acceso administración"
              className="text-[#7d776d] no-underline cursor-pointer"
            >
              {tf("copyright")}
            </Link>
          </span>
          <a
            href="https://selva-digital.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7d776d] no-underline hover:text-marfil transition-colors duration-[250ms]"
          >
            {tf("credit")}
          </a>
        </div>
      </div>
    </footer>
  );
}
