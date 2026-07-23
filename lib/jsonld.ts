import type { Unit } from "@/lib/units";
import { absoluteUrl } from "@/lib/seo";

// Datos estructurados por unidad. La home ya declara el LodgingBusiness; esto
// agrega el Accommodation de cada departamento, que es lo que Google y los
// motores de IA usan para responder "cuánto sale", "para cuántos" y "qué tiene".

export function accommodationJsonLd({
  unit,
  locale,
  nightlyPrice,
}: {
  unit: Unit;
  locale: string;
  nightlyPrice: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: unit.name,
    url: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
    numberOfRooms: unit.specs.bedrooms,
    numberOfBathroomsTotal: unit.specs.baths,
    floorSize: { "@type": "QuantitativeValue", value: unit.specs.area, unitCode: "MTK" },
    occupancy: { "@type": "QuantitativeValue", maxValue: unit.specs.guests, unitText: "huéspedes" },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Aire acondicionado", value: true },
      { "@type": "LocationFeatureSpecification", name: "Cocina equipada", value: true },
      { "@type": "LocationFeatureSpecification", name: "Estacionamiento", value: true },
    ],
    offers: {
      "@type": "Offer",
      price: nightlyPrice,
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/${locale}/tarifas`),
    },
    containedInPlace: {
      "@type": "LodgingBusiness",
      name: "Aruma Lodge",
      url: absoluteUrl(`/${locale}`),
    },
  };
}

export function breadcrumbJsonLd({ locale, unit }: { locale: string; unit: Unit }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Aruma Lodge", item: absoluteUrl(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: "Tarifas", item: absoluteUrl(`/${locale}/tarifas`) },
      {
        "@type": "ListItem",
        position: 3,
        name: unit.name,
        item: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
      },
    ],
  };
}
