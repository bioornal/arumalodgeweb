import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SearchWidget } from "@/components/home/SearchWidget";
import { UnitRateCard } from "@/components/tarifas/UnitRateCard";
import { InfoSections } from "@/components/tarifas/InfoSections";
import { UNITS } from "@/lib/units";
import { parseRateQuery } from "@/lib/reservation/search";
import { getRatesForRange } from "@/lib/reservation/rates.server";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: "Tarifas — Aruma Lodge",
    description: t("description"),
    alternates: { languages: { es: "/es/tarifas", en: "/en/tarifas", pt: "/pt/tarifas" } },
  };
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TarifasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "tarifas" });

  const query = parseRateQuery({ checkIn: str(sp.checkIn), checkOut: str(sp.checkOut), guests: str(sp.guests) });
  // Memoizado (TTL 30s): la segunda llamada dentro de getRatesForRange no pega en la DB.
  const settings = await getRateSettings();
  const rates = query ? await getRatesForRange(query.checkIn, query.checkOut, query.guests) : null;

  return (
    <>
      <SiteNav />
      <main style={{ background: "#F4EFE7", minHeight: "100vh", paddingBottom: 110 }}>
        <div style={{ height: 96 }} />
        <SearchWidget variant="bar" initial={query ?? undefined} />

        <div style={{ maxWidth: 1020, margin: "0 auto", padding: "44px 24px 0" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px,4vw,46px)", margin: 0, color: "#1D1D1D" }}>
            {query ? t("title") : t("pickDatesTitle")}
          </h1>
          <p style={{ fontSize: 14, color: "#6b665d", margin: "8px 0 0" }}>
            {query ? t("subtitle") : t("pickDatesHint")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 30 }}>
            {UNITS.map((unit) => {
              const rate = rates ? rates.find((r) => r.unit.slug === unit.slug)! : null;
              return <UnitRateCard key={unit.slug} unit={unit} rate={rate} query={query} prices={settings.nightly} />;
            })}
          </div>

          <InfoSections />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
