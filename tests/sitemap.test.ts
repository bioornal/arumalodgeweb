import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

describe("sitemap", () => {
  it("incluye la home de los 3 idiomas", () => {
    const urls = sitemap().map((e) => e.url);
    for (const l of ["es", "en", "pt"]) {
      expect(urls.some((u) => u.endsWith(`/${l}`))).toBe(true);
    }
  });

  it("incluye las 3 unidades por idioma", () => {
    const urls = sitemap().map((e) => e.url);
    for (const slug of ["yvyra", "mberu", "tatu"]) {
      for (const l of ["es", "en", "pt"]) {
        expect(urls.some((u) => u.includes(`/${l}/departamentos/${slug}`))).toBe(true);
      }
    }
  });

  it("incluye tarifas y las paginas legales", () => {
    const urls = sitemap().map((e) => e.url).join(" ");
    expect(urls).toContain("/es/tarifas");
    expect(urls).toContain("/es/politicas/cancelacion");
    expect(urls).toContain("/es/privacidad");
  });

  it("NO expone el panel admin ni el checkout", () => {
    const urls = sitemap().map((e) => e.url).join(" ");
    expect(urls).not.toContain("/admin");
    expect(urls).not.toContain("/reservas");
  });

  it("todas las URLs son absolutas y sin doble barra", () => {
    for (const e of sitemap()) {
      expect(e.url).toMatch(/^https:\/\//);
      expect(e.url.replace(/^https:\/\//, "")).not.toContain("//");
    }
  });
});

describe("robots", () => {
  it("bloquea admin y api", () => {
    const rules = robots().rules;
    const all = Array.isArray(rules) ? rules : [rules];
    const generic = all.find((r) => r.userAgent === "*")!;
    expect(generic.disallow).toContain("/admin");
    expect(generic.disallow).toContain("/api");
  });

  it("permite explicitamente a los crawlers de IA", () => {
    const rules = robots().rules;
    const all = Array.isArray(rules) ? rules : [rules];
    const agents = all.flatMap((r) =>
      Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent],
    );
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot"]) {
      expect(agents).toContain(bot);
    }
  });

  it("apunta al sitemap", () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
