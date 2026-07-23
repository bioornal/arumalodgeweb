import { Suspense } from "react";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { ReservaFlow } from "@/components/reservas/ReservaFlow";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { getBookingMode } from "@/lib/site-settings.server";
import { getRateSettings } from "@/lib/reservation/rate-settings.server";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: `Reservas — Aruma Lodge`,
    description: t("description"),
    alternates: {
      languages: {
        es: "/es/reservas",
        en: "/en/reservas",
        pt: "/pt/reservas",
      },
    },
  };
}

export default async function ReservasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Reservas online pausadas: el checkout deriva a tarifas (reserva vía WhatsApp).
  if (isWhatsAppBookingMode(await getBookingMode())) {
    redirect(`/${locale}/tarifas`);
  }

  const settings = await getRateSettings();

  return (
    <main>
      <Suspense fallback={null}>
        <ReservaFlow settings={settings} />
      </Suspense>
    </main>
  );
}
