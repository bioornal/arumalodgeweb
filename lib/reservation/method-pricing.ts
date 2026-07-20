import type { UnitSlug } from "@/lib/units";
import type { RateSettings } from "./rate-settings";
import { computeTotal } from "./pricing";

// Precios por método de pago. El dueño configura en /admin/tarifas lo que quiere
// RECIBIR NETO; el público ve/paga el precio con el costo del canal incluido:
//   precio_público = neto ÷ (1 − pct/100), redondeado HACIA ARRIBA a $100.
// El precio de lista es el de TARJETA (nunca se muestra "recargo" — ley 25.065);
// la transferencia, más barata para el lodge, se presenta como ahorro.

export type PaymentMethod = "card" | "transfer";

/** Grossea un neto para que, tras retener `feePct`%, quede al menos el neto. */
export function grossUp(net: number, feePct: number): number {
  if (net <= 0) return 0;
  const f = Math.min(Math.max(feePct, 0), 50) / 100;
  return Math.ceil(net / (1 - f) / 100) * 100;
}

function pctFor(s: RateSettings, method: PaymentMethod): number {
  return method === "card" ? s.cardFeePct : s.transferFeePct;
}

export type MethodRates = { nightly: Record<UnitSlug, number>; cleaningFee: number };

/** Tarifas públicas (por noche + limpieza) del método. Lineal: el desglose suma el total. */
export function methodRates(s: RateSettings, method: PaymentMethod): MethodRates {
  const pct = pctFor(s, method);
  return {
    nightly: {
      yvyra: grossUp(s.nightly.yvyra, pct),
      mberu: grossUp(s.nightly.mberu, pct),
      tatu: grossUp(s.nightly.tatu, pct),
    },
    cleaningFee: grossUp(s.cleaningFee, pct),
  };
}

export function methodTotal(s: RateSettings, method: PaymentMethod, slug: UnitSlug, nights: number): number {
  const r = methodRates(s, method);
  return computeTotal(r.nightly[slug], nights, r.cleaningFee);
}

/** Ahorro en pesos pagando por transferencia vs tarjeta (piso 0). */
export function transferSavings(s: RateSettings, slug: UnitSlug, nights: number): number {
  return Math.max(0, methodTotal(s, "card", slug, nights) - methodTotal(s, "transfer", slug, nights));
}
