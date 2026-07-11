import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { UnitDetail } from "@/components/departamento/UnitDetail";
import { UNITS, getUnit } from "@/lib/units";
import { routing } from "@/lib/i18n/routing";

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

  return (
    <>
      <SiteNav />
      <main>
        <UnitDetail unit={unit} locale={locale} />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
