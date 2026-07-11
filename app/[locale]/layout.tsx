import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { display, sans } from "@/lib/fonts";
import { FilmGrain } from "@/components/layout/FilmGrain";
import { LenisProvider } from "@/components/motion/LenisProvider";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // suppressHydrationWarning: el script inline del body puede agregar la
  // clase sin-fx a <html> antes de hidratar (mismo patrón que next-themes)
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        {/* Kill-switch de diagnóstico (?sinfx=1): corre antes de hidratar,
            para poder apagar todos los efectos en producción. Ver lib/fx.ts */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if(location.search.indexOf("sinfx")>-1)document.documentElement.classList.add("sin-fx");',
          }}
        />
        <NextIntlClientProvider>
          <FilmGrain />
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
