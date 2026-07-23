import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: `${t("privacyTitle")} — Aruma Lodge`,
    description: t("privacyIntro"),
    alternates: {
      languages: {
        es: "/es/privacidad",
        en: "/en/privacidad",
        pt: "/pt/privacidad",
      },
    },
  };
}

export default async function PrivacidadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage
      title={t("privacyTitle")}
      updatedAt={t("updatedAt")}
      intro={t("privacyIntro")}
      sections={[
        { heading: t("privacyH1"), body: t("privacyP1") },
        { heading: t("privacyH2"), body: t("privacyP2") },
        { heading: t("privacyH3"), body: t("privacyP3") },
        { heading: t("privacyH4"), body: t("privacyP4") },
        { heading: t("privacyH5"), body: t("privacyP5") },
        { heading: t("privacyH6"), body: t("privacyP6") },
        { heading: t("privacyH7"), body: t("privacyP7") },
      ]}
    />
  );
}
