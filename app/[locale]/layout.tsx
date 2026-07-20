import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { display, sans } from "@/lib/fonts";
import { FilmGrain } from "@/components/layout/FilmGrain";
import { FxWatchdog } from "@/components/motion/FxWatchdog";
import { fxDefaultAttr, FX_BOOT_SCRIPT } from "@/lib/fx";
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
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable}`}
      {...fxDefaultAttr()}
      suppressHydrationWarning
    >
      <body>
        {/* Kill-switch de efectos (ver lib/fx.ts): el server ya manda
            data-fx=FX_DEFAULT; este script aplica los overrides por URL
            (?sinfx=1 / ?fx=on / ?fx=lista) y el flag del FxWatchdog antes
            de hidratar. La URL siempre le gana al flag. */}
        <script dangerouslySetInnerHTML={{ __html: FX_BOOT_SCRIPT }} />
        <NextIntlClientProvider>
          <FilmGrain />
          <FxWatchdog />
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
