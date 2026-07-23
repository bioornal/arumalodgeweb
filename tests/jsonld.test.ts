import { describe, it, expect } from "vitest";
import { accommodationJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { getUnit } from "@/lib/units";

const unit = getUnit("yvyra")!;

describe("accommodationJsonLd", () => {
  const ld = accommodationJsonLd({ unit, locale: "es", nightlyPrice: 216900 }) as Record<string, any>;

  it("es un Accommodation con el nombre de la unidad", () => {
    expect(ld["@type"]).toBe("Accommodation");
    expect(ld.name).toBe("Suite Yvyrá");
  });

  it("publica el precio por noche en ARS", () => {
    expect(ld.offers.price).toBe(216900);
    expect(ld.offers.priceCurrency).toBe("ARS");
  });

  it("declara capacidad y ambientes desde las specs de la unidad", () => {
    expect(ld.occupancy.maxValue).toBe(unit.specs.guests);
    expect(ld.numberOfRooms).toBe(unit.specs.bedrooms);
    expect(ld.floorSize.value).toBe(unit.specs.area);
  });

  it("la URL es absoluta y del idioma pedido", () => {
    expect(ld.url).toMatch(/^https:\/\/.+\/es\/departamentos\/yvyra$/);
  });

  it("no emite campos vacios ni undefined", () => {
    expect(JSON.stringify(ld)).not.toContain("undefined");
  });
});

describe("breadcrumbJsonLd", () => {
  const ld = breadcrumbJsonLd({ locale: "es", unit }) as Record<string, any>;

  it("tiene 3 niveles: inicio, departamentos, unidad", () => {
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[2].name).toBe("Suite Yvyrá");
  });

  it("las posiciones van de 1 a 3 en orden", () => {
    expect(ld.itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3]);
  });
});
