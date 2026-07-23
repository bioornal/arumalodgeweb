import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const KEYS = [
  "NEXT_PUBLIC_ARUMA_BANK_ALIAS",
  "NEXT_PUBLIC_ARUMA_BANK_CBU",
  "NEXT_PUBLIC_ARUMA_BANK_HOLDER",
] as const;

const ORIGINAL = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => vi.resetModules());

afterEach(() => {
  for (const k of KEYS) {
    if (ORIGINAL[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL[k];
  }
});

describe("BANK_DETAILS", () => {
  it("usa los valores reales cuando están seteados", async () => {
    process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS = "ARUMA.REAL";
    process.env.NEXT_PUBLIC_ARUMA_BANK_CBU = "2850590940090418135201";
    process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER = "Aruma Lodge SRL";
    const { BANK_DETAILS } = await import("@/lib/site");
    expect(BANK_DETAILS.alias).toBe("ARUMA.REAL");
    expect(BANK_DETAILS.cbu).toBe("2850590940090418135201");
    expect(BANK_DETAILS.holder).toBe("Aruma Lodge SRL");
  });

  it("un string VACÍO cuenta como ausente y cae al placeholder", async () => {
    for (const k of KEYS) process.env[k] = "";
    const { BANK_DETAILS } = await import("@/lib/site");
    expect(BANK_DETAILS.cbu).toBe("0000000000000000000000");
    expect(BANK_DETAILS.alias).toBe("ARUMA.LODGE.IGUAZU");
  });

  it("un string con solo espacios también cuenta como ausente", async () => {
    for (const k of KEYS) process.env[k] = "   ";
    const { BANK_DETAILS } = await import("@/lib/site");
    expect(BANK_DETAILS.cbu).toBe("0000000000000000000000");
  });
});

describe("bankDetailsConfigured", () => {
  it("es false con los placeholders puestos", async () => {
    for (const k of KEYS) delete process.env[k];
    const { bankDetailsConfigured } = await import("@/lib/site");
    expect(bankDetailsConfigured()).toBe(false);
  });

  it("es true solo con los tres datos reales cargados", async () => {
    process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS = "ARUMA.REAL";
    process.env.NEXT_PUBLIC_ARUMA_BANK_CBU = "2850590940090418135201";
    process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER = "Aruma Lodge SRL";
    const { bankDetailsConfigured } = await import("@/lib/site");
    expect(bankDetailsConfigured()).toBe(true);
  });

  it("es false si falta uno solo de los tres", async () => {
    process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS = "ARUMA.REAL";
    process.env.NEXT_PUBLIC_ARUMA_BANK_CBU = "2850590940090418135201";
    delete process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER;
    const { bankDetailsConfigured } = await import("@/lib/site");
    expect(bankDetailsConfigured()).toBe(false);
  });
});
