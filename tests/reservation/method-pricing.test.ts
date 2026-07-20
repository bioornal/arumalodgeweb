import { describe, it, expect } from "vitest";
import {
  grossUp,
  methodRates,
  methodTotal,
  transferSavings,
} from "@/lib/reservation/method-pricing";
import type { RateSettings } from "@/lib/reservation/rate-settings";

const SETTINGS: RateSettings = {
  nightly: { yvyra: 200000, mberu: 200000, tatu: 130000 },
  cleaningFee: 30000,
  baseGuests: 4,
  extraGuestFee: 0,
  cardFeePct: 7.7,
  transferFeePct: 5,
};

describe("grossUp", () => {
  it("neto ÷ (1 − pct) redondeado HACIA ARRIBA a $100", () => {
    // 130000 / 0.923 = 140845.07… → 140900
    expect(grossUp(130000, 7.7)).toBe(140900);
    // 130000 / 0.95 = 136842.1… → 136900
    expect(grossUp(130000, 5)).toBe(136900);
  });

  it("pct 0 = identidad (redondeada a $100 hacia arriba solo si hace falta)", () => {
    expect(grossUp(130000, 0)).toBe(130000);
    expect(grossUp(130050, 0)).toBe(130100);
  });

  it("neto 0 o negativo → 0", () => {
    expect(grossUp(0, 7.7)).toBe(0);
    expect(grossUp(-5, 7.7)).toBe(0);
  });

  it("el redondeo nunca deja el neto por debajo del objetivo", () => {
    for (const net of [1000, 30000, 130000, 200000, 999999]) {
      for (const pct of [5, 6.29, 7.61, 7.7, 10]) {
        const charged = grossUp(net, pct);
        const received = charged * (1 - pct / 100);
        expect(received).toBeGreaterThanOrEqual(net);
      }
    }
  });
});

describe("methodRates", () => {
  it("card usa cardFeePct en nightly y limpieza", () => {
    const r = methodRates(SETTINGS, "card");
    expect(r.nightly.tatu).toBe(140900);
    expect(r.cleaningFee).toBe(grossUp(30000, 7.7)); // 30000/0.923=32502.7 → 32600
    expect(r.cleaningFee).toBe(32600);
  });

  it("transfer usa transferFeePct", () => {
    const r = methodRates(SETTINGS, "transfer");
    expect(r.nightly.tatu).toBe(136900);
    expect(r.cleaningFee).toBe(31600); // 30000/0.95=31578.9 → 31600
  });
});

describe("methodTotal", () => {
  it("total = nightly grosseada × noches + limpieza grosseada", () => {
    // card, tatu, 3 noches: 140900*3 + 32600 = 455300
    expect(methodTotal(SETTINGS, "card", "tatu", 3)).toBe(455300);
    // transfer: 136900*3 + 31600 = 442300
    expect(methodTotal(SETTINGS, "transfer", "tatu", 3)).toBe(442300);
  });

  it("0 noches → 0", () => {
    expect(methodTotal(SETTINGS, "card", "tatu", 0)).toBe(0);
  });
});

describe("transferSavings", () => {
  it("ahorro = totalCard − totalTransfer, positivo con card > transfer", () => {
    expect(transferSavings(SETTINGS, "tatu", 3)).toBe(455300 - 442300);
  });

  it("nunca negativo aunque los pct estén invertidos", () => {
    const inverted = { ...SETTINGS, cardFeePct: 2, transferFeePct: 9 };
    expect(transferSavings(inverted, "tatu", 3)).toBe(0);
  });
});
