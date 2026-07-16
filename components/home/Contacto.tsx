import { useTranslations } from "next-intl";
import { Kicker } from "@/components/ui/Kicker";
import { Reveal } from "@/components/motion/Reveal";
import { ContactForm } from "./ContactForm";
import { waLink, CONTACT_EMAIL, CONTACT_PHONE_HREF } from "@/lib/contact";

const WA_HREF = waLink();
const MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d660.1445607832369!2d-54.57444015912828!3d-25.61587341498988!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94f692504f45817b%3A0xd868aa283d79c377!2sObispo%20Angelelli%2095%2C%20N3378%20Puerto%20Iguaz%C3%BA%2C%20Misiones!5e1!3m2!1ses-419!2sar!4v1781475283983!5m2!1ses-419!2sar";
const MAPS_DIRECTIONS =
  "https://www.google.com/maps/search/?api=1&query=Santa+Mar%C3%ADa+del+Iguaz%C3%BA+esq+Obispo+Angelelli+Puerto+Iguaz%C3%BA";

export function Contacto() {
  const t = useTranslations("contacto");

  return (
    <section
      id="contacto"
      className="bg-arena text-carbon border-b border-borde-medio py-16 md:py-[130px]"
    >
      <div className="relative z-[1] mx-auto max-w-[1320px] px-5 md:px-12">
        {/* Header */}
        <Reveal className="text-center mb-12 md:mb-[64px]">
          <Kicker>{t("kicker")}</Kicker>
          <h2
            className="font-display font-normal leading-[1.04] tracking-[-0.01em] text-carbon"
            style={{
              fontSize: "clamp(30px,4.6vw,60px)",
              margin: "16px 0 0",
            }}
          >
            {t("title")}
          </h2>
        </Reveal>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 md:gap-16 items-start">
          {/* LEFT column */}
          <Reveal>
            {/* WhatsApp card */}
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-4 rounded-[4px] no-underline transition-[border-color,transform] duration-300 hover:border-[#3f8f5f] hover:-translate-y-[2px]"
              style={{
                background: "#23362B",
                border: "1px solid #314237",
                padding: "20px 22px",
              }}
            >
              {/* WhatsApp icon circle */}
              <span
                className="flex-none flex items-center justify-center rounded-full"
                style={{ width: 46, height: 46, background: "#2BB673" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0c1a12">
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.042zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </span>

              {/* Text block */}
              <div className="flex-1">
                <div
                  className="font-semibold"
                  style={{ fontSize: 15, color: "#F8F5F0" }}
                >
                  {t("whatsappSub")}
                </div>
                <div style={{ fontSize: 13, color: "#9fb0a3", marginTop: 3 }}>
                  {t("whatsappTitle")}
                </div>
              </div>

              {/* Arrow */}
              <span style={{ color: "#3f8f5f", fontSize: 18 }}>→</span>
            </a>

            {/* Info grid: Dónde + Directo */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ gap: 28, margin: "36px 0 40px" }}
            >
              {/* Column A: Dónde estamos */}
              <div>
                <div
                  className="uppercase text-bronce"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    marginBottom: 12,
                  }}
                >
                  {t("whereTitle")}
                </div>
                <div
                  className="font-display"
                  style={{ fontSize: 21, color: "#1D1D1D", lineHeight: 1.35 }}
                >
                  Puerto Iguazú
                  <br />
                  Misiones, Argentina
                </div>
                <div
                  className="text-muted"
                  style={{
                    fontSize: 13,
                    marginTop: 8,
                    lineHeight: 1.6,
                  }}
                >
                  {t("addressNote")}
                </div>
              </div>

              {/* Column B: Directo */}
              <div>
                <div
                  className="uppercase text-bronce"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    marginBottom: 12,
                  }}
                >
                  {t("directTitle")}
                </div>
                <div
                  className="flex flex-col"
                  style={{ gap: 9, fontSize: 14 }}
                >
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="no-underline transition-colors duration-[250ms] hover:text-terracota"
                    style={{ color: "#4a463f" }}
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <a
                    href={CONTACT_PHONE_HREF}
                    className="no-underline transition-colors duration-[250ms] hover:text-terracota"
                    style={{ color: "#4a463f" }}
                  >
                    +54 9 3757 652002
                  </a>
                  <span style={{ color: "#6b665d" }}>{t("checkInOut")}</span>
                </div>

                {/* Social icons */}
                <div className="flex gap-[10px]" style={{ marginTop: 18 }}>
                  <a
                    href="#contacto"
                    aria-label="Instagram"
                    className="flex items-center justify-center rounded-full transition-[border-color,color] duration-300 hover:border-bronce hover:text-carbon"
                    style={{
                      width: 36,
                      height: 36,
                      border: "1px solid #c9bfae",
                      color: "#6b665d",
                    }}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4.2" />
                      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a
                    href="#contacto"
                    aria-label="Facebook"
                    className="flex items-center justify-center rounded-full transition-[border-color,color] duration-300 hover:border-bronce hover:text-carbon"
                    style={{
                      width: 36,
                      height: 36,
                      border: "1px solid #c9bfae",
                      color: "#6b665d",
                    }}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M13.5 21v-8h2.5l.5-3h-3V8.2c0-.9.3-1.5 1.6-1.5H17V4.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.3-3.7 3.8V10H8.5v3H11v8h2.5z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact form (client component) */}
            <ContactForm />
          </Reveal>

          {/* RIGHT column: Map */}
          <Reveal>
            <div
              className="relative rounded-[4px] overflow-hidden h-[420px] lg:h-[560px]"
              style={{
                border: "1px solid #cdbfa9",
                background: "#d8cfbf",
              }}
            >
              {/* Google Maps iframe */}
              <iframe
                title="Mapa Aruma Lodge"
                src={MAPS_EMBED}
                className="absolute inset-0 w-full h-full border-0"
                style={{
                  filter: "grayscale(1) contrast(.95) sepia(.1)",
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              {/* Inset shadow overlay */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow: "inset 0 0 90px 6px rgba(29,29,29,.18)",
                }}
              />

              {/* Lodge info card — bottom left */}
              <div
                className="absolute bottom-4 left-4 rounded-[3px] px-4 py-3 sm:bottom-[22px] sm:left-[22px] sm:px-[18px] sm:py-[14px]"
                style={{
                  background: "rgba(29,29,29,.82)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid #3a352f",
                }}
              >
                <div
                  className="font-display"
                  style={{
                    fontSize: 19,
                    color: "#F8F5F0",
                    letterSpacing: "0.04em",
                  }}
                >
                  Aruma Lodge
                </div>
                <div
                  style={{ fontSize: 12, color: "#a39d92", marginTop: 3 }}
                >
                  Puerto Iguazú · Misiones
                </div>
              </div>

              {/* "Cómo llegar" link — bottom right */}
              <a
                href={MAPS_DIRECTIONS}
                target="_blank"
                rel="noopener"
                className="absolute right-4 top-4 no-underline uppercase rounded-[2px] transition-colors duration-300 hover:bg-arena sm:top-auto sm:right-[22px] sm:bottom-[22px]"
                style={{
                  background: "#F8F5F0",
                  color: "#1D1D1D",
                  fontSize: 11.5,
                  letterSpacing: "0.08em",
                  padding: "10px 16px",
                }}
              >
                {t("mapCta")}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
