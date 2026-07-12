export type UnitSlug = "yvyra" | "mberu" | "tatu";
export type Unit = {
  slug: UnitSlug;
  name: string;
  price: number;
  specs: { guests: number; bedrooms: number; baths: number; area: number };
};
export const UNITS: Unit[] = [
  { slug: "yvyra", name: "Suite Yvyrá", price: 150000, specs: { guests: 6, bedrooms: 3, baths: 3, area: 140 } },
  { slug: "mberu", name: "Departamento Mberú", price: 250000, specs: { guests: 6, bedrooms: 2, baths: 1, area: 60 } },
  { slug: "tatu",  name: "Cabaña Tatú", price: 130000, specs: { guests: 5, bedrooms: 2, baths: 1, area: 65 } },
];
export const CLEANING_FEE = 30000;
export const BASE_GUESTS = 4;
export const YVYRA_PRICE = 150000;
export const MBERU_PRICE = 250000;
export const TATU_PRICE = 130000;

/** Precio por noche según unidad (tarifa plana por unidad, sin importar huéspedes).
 *  - Suite Yvyrá: $150.000 (hasta 6 huéspedes).
 *  - Departamento Mberú: $250.000 (hasta 6 huéspedes).
 *  - Cabaña Tatú: $130.000 (hasta 5 huéspedes). */
export function pricePerNight(slug: UnitSlug, _guests: number): number {
  switch (slug) {
    case "yvyra": return YVYRA_PRICE;
    case "mberu": return MBERU_PRICE;
    case "tatu":  return TATU_PRICE;
  }
}
export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}
