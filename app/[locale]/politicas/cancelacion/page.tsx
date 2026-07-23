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
    title: `${t("cancelTitle")} — Aruma Lodge`,
    description: t("cancelIntro"),
    alternates: {
      languages: {
        es: "/es/politicas/cancelacion",
        en: "/en/politicas/cancelacion",
        pt: "/pt/politicas/cancelacion",
      },
    },
  };
}

export default async function CancelacionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPage
      title={t("cancelTitle")}
      updatedAt={t("updatedAt")}
      intro={t("cancelIntro")}
      sections={[
        { heading: t("cancelH1"), body: t("cancelP1") },
        { heading: t("cancelH2"), body: t("cancelP2") },
        { heading: t("cancelH3"), body: t("cancelP3") },
        { heading: t("cancelH4"), body: t("cancelP4") },
        { heading: t("cancelH5"), body: t("cancelP5") },
        { heading: t("cancelH6"), body: t("cancelP6") },
      ]}
    />
  );
}
