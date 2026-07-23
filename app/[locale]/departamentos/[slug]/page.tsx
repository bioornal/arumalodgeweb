import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { UnitDetail } from "@/components/departamento/UnitDetail";
import { UNITS, getUnit } from "@/lib/units";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";
import { getBookingMode } from "@/lib/site-settings.server";
import { routing } from "@/lib/i18n/routing";
import { accommodationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { methodRates } from "@/lib/reservation/method-pricing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    UNITS.map((unit) => ({ locale, slug: unit.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const unit = getUnit(slug);
  if (!unit) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: `${unit.name} — Aruma Lodge`,
    description: t("description"),
    alternates: {
      languages: {
        es: `/es/departamentos/${slug}`,
        en: `/en/departamentos/${slug}`,
        pt: `/pt/departamentos/${slug}`,
      },
    },
  };
}

export default async function DepartamentoPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const unit = getUnit(slug);
  if (!unit) notFound();

  const settings = await getRateSettings();
  const bookingMode = await getBookingMode();
  // Precio de lista público = método tarjeta (comisión incluida, ver method-pricing.ts)
  const listPrices = methodRates(settings, "card").nightly;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            accommodationJsonLd({ unit, locale, nightlyPrice: listPrices[unit.slug] }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd({ locale, unit })) }}
      />
      <SiteNav />
      <main>
        <UnitDetail unit={unit} locale={locale} prices={settings.nightly} bookingMode={bookingMode} />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
