import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { buildCheckoutUrl, type RateQuery } from "@/lib/reservation/search";
import type { UnitRate } from "@/lib/reservation/rates.server";
import type { Unit, UnitSlug } from "@/lib/units";
import { isWhatsAppBookingMode, type BookingMode } from "@/lib/booking-mode";
import { waLink } from "@/lib/contact";

function fmtDay(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

const money = (n: number) => "$" + new Intl.NumberFormat("es-AR").format(n);

interface UnitRateCardProps {
  unit: Unit;
  rate: UnitRate | null; // null = sin fechas elegidas (modo "desde")
  query: RateQuery | null;
  prices: Record<UnitSlug, number>; // tarifa actual por noche (DB, vía getRateSettings)
  bookingMode: BookingMode;
}

export function UnitRateCard({ unit, rate, query, prices, bookingMode }: UnitRateCardProps) {
  const t = useTranslations("tarifas");
  const locale = useLocale();
  const whatsappMode = isWhatsAppBookingMode(bookingMode);
  const overCapacity = !!query && query.guests > unit.specs.guests;
  const bookable = !!rate && rate.available && !overCapacity;
  const nightly = rate ? rate.nightly : prices[unit.slug];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] md:gap-6 overflow-hidden rounded-lg border border-[#E7E0D4] bg-white">
      <div className="h-[210px] md:h-auto md:min-h-[220px]">
        <ImageSlot label={unit.name} className="h-full w-full" />
      </div>

      <div className="flex flex-col p-5 md:py-6 md:pl-0 md:pr-7">
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 27, margin: 0, color: "#1D1D1D" }}>
          {unit.name}
        </h3>
        <p style={{ fontSize: 13, color: "#6b665d", margin: "8px 0 0" }}>
          {t("specs", { guests: unit.specs.guests, bedrooms: unit.specs.bedrooms, baths: unit.specs.baths, area: unit.specs.area })}
        </p>

        <div style={{ marginTop: "auto", paddingTop: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            {rate && rate.available && rate.nights > 0 ? (
              <>
                <div style={{ fontSize: 13, color: "#6b665d" }}>
                  {money(nightly)} × {rate.nights} {rate.nights === 1 ? t("night") : t("nights")} + {t("cleaning")}
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: "#1D1D1D", marginTop: 2 }}>
                  {money(rate.total)} <span style={{ fontSize: 14, color: "#6b665d" }}>{t("total")}</span>
                </div>
                {!whatsappMode && rate.savings > 0 && (
                  <div style={{ fontSize: 12.5, color: "#2f5d33", marginTop: 4 }}>
                    {t("transferNote", { total: money(rate.transferTotal), savings: money(rate.savings) })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: "#1D1D1D" }}>
                {t("from")} {money(prices[unit.slug])} <span style={{ fontSize: 14, color: "#6b665d" }}>{t("perNight")}</span>
              </div>
            )}
          </div>

          {bookable && query ? (
            whatsappMode ? (
              <a
                href={waLink(
                  t("waMessage", {
                    unit: unit.name,
                    checkIn: fmtDay(query.checkIn, locale),
                    checkOut: fmtDay(query.checkOut, locale),
                    guests: query.guests,
                  }),
                )}
                target="_blank"
                rel="noopener"
                style={ctaStyle(true)}
              >
                {t("reserveWhatsApp")}
              </a>
            ) : (
              <Link href={buildCheckoutUrl({ unitId: unit.slug, ...query })} style={ctaStyle(true)}>
                {t("reserve")}
              </Link>
            )
          ) : (
            <span style={ctaStyle(false)}>
              {!query ? t("pickDatesCta") : overCapacity ? t("capacity", { n: unit.specs.guests }) : t("unavailable")}
            </span>
          )}
        </div>

        {whatsappMode && bookable && (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#6b665d", textAlign: "right" }}>
            {t("waNote")}
          </p>
        )}
      </div>
    </div>
  );
}

function ctaStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "13px 26px", borderRadius: 3, textDecoration: "none",
    fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase",
    background: active ? "#A04B2A" : "#ece5d9",
    color: active ? "#F8F5F0" : "#8a8170",
    cursor: active ? "pointer" : "default",
    whiteSpace: "nowrap",
  };
}
