import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { LookupForm } from "@/components/reservas/LookupForm";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "miReserva" });
  return { title: `${t("title")} — Aruma Lodge` };
}

export default async function MiReservaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "miReserva" });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "96px 20px 120px" }}>
      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 400,
          fontSize: 40,
          textAlign: "center",
          color: "#23362B",
          margin: 0,
        }}
      >
        {t("title")}
      </h1>
      <p
        style={{
          textAlign: "center",
          fontSize: 15,
          lineHeight: 1.7,
          fontWeight: 300,
          color: "#5b5347",
          margin: "14px auto 0",
          maxWidth: "44ch",
        }}
      >
        {t("intro")}
      </p>
      <Suspense fallback={null}>
        <LookupForm />
      </Suspense>
    </main>
  );
}
