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
        {/* Kill-switch de diagnóstico (?sinfx=1 / ?fx=lista): corre antes de
            hidratar, para bisecar efectos en producción. Ver lib/fx.ts */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'var q=location.search,m=q.match(/[?&]fx=([^&]*)/);' +
              'if(q.indexOf("sinfx")>-1)document.documentElement.dataset.fx="";' +
              'else if(m)document.documentElement.dataset.fx=decodeURIComponent(m[1]).replace(/,/g," ");',
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
