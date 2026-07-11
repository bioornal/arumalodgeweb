import { describe, it, expect } from "vitest";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

function leafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? leafKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("i18n message parity", () => {
  const esKeys = leafKeys(es).sort();
  it("en tiene exactamente las mismas claves que es", () => {
    expect(leafKeys(en).sort()).toEqual(esKeys);
  });
  it("pt tiene exactamente las mismas claves que es", () => {
    expect(leafKeys(pt).sort()).toEqual(esKeys);
  });
  it("ninguna traducción está vacía", () => {
    for (const m of [es, en, pt]) {
      for (const key of leafKeys(m as Record<string, unknown>)) {
        const val = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], m);
        expect(String(val).length, key).toBeGreaterThan(0);
      }
    }
  });
});
