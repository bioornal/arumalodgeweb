import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => vi.resetModules());

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("SITE_URL", () => {
  it("usa la env var cuando está seteada", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar";
    const { SITE_URL } = await import("@/lib/seo");
    expect(SITE_URL).toBe("https://arumalodge.com.ar");
  });

  it("saca la barra final para que no salgan URLs con doble barra", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar/";
    const { SITE_URL } = await import("@/lib/seo");
    expect(SITE_URL).toBe("https://arumalodge.com.ar");
  });

  it("cae al dominio de Netlify si la env var falta o está vacía", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const a = await import("@/lib/seo");
    expect(a.SITE_URL).toBe("https://aruma-lodge.netlify.app");

    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    const b = await import("@/lib/seo");
    expect(b.SITE_URL).toBe("https://aruma-lodge.netlify.app");
  });
});

describe("absoluteUrl", () => {
  it("arma URLs absolutas normalizando la barra inicial", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar";
    const { absoluteUrl } = await import("@/lib/seo");
    expect(absoluteUrl("/es/tarifas")).toBe("https://arumalodge.com.ar/es/tarifas");
    expect(absoluteUrl("es/tarifas")).toBe("https://arumalodge.com.ar/es/tarifas");
  });

  it("la raíz no deja barra colgando", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://arumalodge.com.ar";
    const { absoluteUrl } = await import("@/lib/seo");
    expect(absoluteUrl("/")).toBe("https://arumalodge.com.ar");
  });
});
