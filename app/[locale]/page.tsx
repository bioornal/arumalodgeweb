import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/layout/SiteNav";
import { SelvaTrail } from "@/components/motion/SelvaTrail";
import { Hero } from "@/components/home/Hero";
import { SearchWidget } from "@/components/home/SearchWidget";
import { Manifiesto } from "@/components/home/Manifiesto";
import { UnitsGrid } from "@/components/home/UnitsGrid";
import { Experiencias } from "@/components/home/Experiencias";
import { RelatoImagenes } from "@/components/home/RelatoImagenes";
import { CtaReserva } from "@/components/home/CtaReserva";
import { Contacto } from "@/components/home/Contacto";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";

const LODGING_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Aruma Lodge",
  description:
    "Departamentos turísticos de autor en el corazón de Iguazú, Misiones. Reserva directa, confirmación automática.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Santa María del Iguazú esq. Obispo Angelelli",
    addressLocality: "Puerto Iguazú",
    addressRegion: "Misiones",
    addressCountry: "AR",
  },
  geo: { "@type": "GeoCoordinates", latitude: -25.6159, longitude: -54.5744 },
  telephone: "+54 9 3757 419667",
  email: "arumalodge.iguazu@gmail.com",
  priceRange: "$$",
  aggregateRating: undefined,
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Wi-Fi" },
    { "@type": "LocationFeatureSpecification", name: "Aire acondicionado" },
    { "@type": "LocationFeatureSpecification", name: "Cocina equipada" },
    { "@type": "LocationFeatureSpecification", name: "Estacionamiento" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  const siteUrl = "https://aruma-lodge.netlify.app";
  const canonicalUrl = `${siteUrl}/${locale}`;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: { es: "/es", en: "/en", pt: "/pt" },
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      locale: { es: "es_AR", en: "en_US", pt: "pt_BR" }[locale] ?? "es_AR",
      siteName: "Aruma Lodge",
      images: [
        {
          url: "https://res.cloudinary.com/djtvjkcu6/image/upload/c_fill,g_auto,w_1200,h_630,q_auto/v1781879164/ArumaLodge/Hero_bgsjtf.jpg",
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: "Aruma Lodge — Puerto Iguazú",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        "https://res.cloudinary.com/djtvjkcu6/image/upload/c_fill,g_auto,w_1200,h_630,q_auto/v1781879164/ArumaLodge/Hero_bgsjtf.jpg",
      ],
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LODGING_JSONLD) }}
      />
      <SiteNav />
      <main className="relative">
        <SelvaTrail />
        <Hero />
        <SearchWidget variant="hero" />
        <Manifiesto />
        <UnitsGrid />
        <Experiencias />
        <RelatoImagenes />
        <CtaReserva />
        <Contacto />
      </main>
      <SiteFooter />
      <WhatsAppFab />
    </>
  );
}
