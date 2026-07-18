import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { display, sans } from "@/lib/fonts";
import { FilmGrain } from "@/components/layout/FilmGrain";
import { FxWatchdog } from "@/components/motion/FxWatchdog";
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
        {/* Kill-switch de diagnóstico (?sinfx=1 / ?fx=lista) + auto-degradado
            (flag aruma-fx-off que graba FxWatchdog, TTL 24h): corre antes de
            hidratar, para bisecar efectos en producción o arrancar sin ellos
            en máquinas que no llegan. La URL siempre le gana al flag.
            Ver lib/fx.ts y components/motion/FxWatchdog.tsx */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'var d=document.documentElement,q=location.search,m=q.match(/[?&]fx=([^&]*)/);' +
              'if(q.indexOf("sinfx")>-1)d.dataset.fx="";' +
              'else if(m)d.dataset.fx=decodeURIComponent(m[1]).replace(/,/g," ");' +
              'else{try{var t=+localStorage.getItem("aruma-fx-off");' +
              'if(t&&Date.now()-t<864e5)d.dataset.fx="";}catch(e){}}',
          }}
        />
        <NextIntlClientProvider>
          <FilmGrain />
          <FxWatchdog />
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
