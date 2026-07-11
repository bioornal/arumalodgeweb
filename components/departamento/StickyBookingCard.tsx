import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import type { Unit } from "@/lib/units";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

export function StickyBookingCard({ unit }: { unit: Unit }) {
  const t = useTranslations("departamento");
  const tb = useTranslations("bookingBar");
  const whatsappMode = isWhatsAppBookingMode();
  const ctaClass =
    "mt-[18px] block text-center bg-terracota text-marfil text-[12.5px] uppercase tracking-[.1em] px-4 py-4 rounded-[3px] no-underline transition-[background,transform] duration-300 hover:bg-terracota-hover hover:-translate-y-0.5";

  return (
    <div className="lg:sticky lg:top-[108px]">
      <div
        className="bg-marfil rounded-[6px] border border-borde-claro p-7"
        style={{ boxShadow: "0 40px 80px -52px rgba(29,29,29,.5)" }}
      >
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[36px] text-carbon">
            ${new Intl.NumberFormat("es-AR").format(unit.price)}
          </span>
          <span className="text-[13px] text-muted">{t("perNight")}</span>
        </div>

        {/* Dates + guests mini-grid */}
        <div
          className="mt-5 rounded-[4px] border border-borde-claro overflow-hidden"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#E2DACE" }}
        >
          {/* Llegada */}
          <div className="bg-white px-[15px] py-[13px]">
            <div className="text-[10px] uppercase tracking-[.16em] text-bronce">
              {tb("arrival")}
            </div>
            <div className="mt-1 text-[15px] text-carbon">— / — / —</div>
          </div>
          {/* Salida */}
          <div className="bg-white px-[15px] py-[13px]">
            <div className="text-[10px] uppercase tracking-[.16em] text-bronce">
              {tb("departure")}
            </div>
            <div className="mt-1 text-[15px] text-carbon">— / — / —</div>
          </div>
          {/* Huéspedes — full width */}
          <div className="bg-white px-[15px] py-[13px] border-t border-borde-claro" style={{ gridColumn: "span 2" }}>
            <div className="text-[10px] uppercase tracking-[.16em] text-bronce">
              {tb("guests")}
            </div>
            <div className="mt-1 text-[15px] text-carbon">{unit.specs.guests} —</div>
          </div>
        </div>

        {/* Book CTA */}
        {whatsappMode ? (
          <a href={waLink(t("waBookMessage", { unit: unit.name }))} target="_blank" rel="noopener" className={ctaClass}>
            {t("bookCtaWhatsApp")}
          </a>
        ) : (
          <Link href={`/reservas?unit=${unit.slug}`} className={ctaClass}>
            {t("bookCta")}
          </Link>
        )}

        {/* Note */}
        <div className="mt-[14px] text-center text-[12px] text-muted">
          {whatsappMode ? t("waBookNote") : t("bookNote")}
        </div>

        {/* WhatsApp link */}
        <div className="mt-[18px] pt-[18px] border-t border-[#E7E0D4] flex items-center justify-center gap-[10px]">
          <a
            href={waLink(t("waBookMessage", { unit: unit.name }))}
            target="_blank"
            rel="noopener"
            className="text-[13px] text-selva font-semibold no-underline border-b border-[#b9c6bc] pb-[2px] transition-colors duration-[250ms] hover:text-whatsapp"
          >
            {t("whatsappLink")} →
          </a>
        </div>
      </div>
    </div>
  );
}
