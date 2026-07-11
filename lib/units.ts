export type UnitSlug = "yvyra" | "mberu" | "tatu";
export type Unit = {
  slug: UnitSlug;
  name: string;
  price: number;
  specs: { guests: number; bedrooms: number; baths: number; area: number };
};
export const UNITS: Unit[] = [
  { slug: "yvyra", name: "Suite Yvyrá", price: 150000, specs: { guests: 8, bedrooms: 3, baths: 3, area: 140 } },
  { slug: "mberu", name: "Departamento Mberú", price: 150000, specs: { guests: 6, bedrooms: 2, baths: 1, area: 60 } },
  { slug: "tatu",  name: "Cabaña Tatú", price: 140000, specs: { guests: 5, bedrooms: 2, baths: 1, area: 65 } },
];
export const CLEANING_FEE = 30000;
export const BASE_GUESTS = 4;
export const TATU_PRICE = 140000;
export const BASE_PRICE = 150000;
export const EXTENDED_PRICE = 180000;

/** Precio por noche según unidad y huéspedes.
 *  - Cabaña Tatú: tarifa plana $140.000 (hasta 5 huéspedes).
 *  - Yvyrá (hasta 8) / Mberú (hasta 6): $150.000 hasta 4 huéspedes; $180.000 por encima. */
export function pricePerNight(slug: UnitSlug, guests: number): number {
  if (slug === "tatu") return TATU_PRICE;
  return guests <= BASE_GUESTS ? BASE_PRICE : EXTENDED_PRICE;
}
export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}
