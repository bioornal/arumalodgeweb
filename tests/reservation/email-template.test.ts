import { describe, it, expect } from "vitest";
import { buildConfirmationEmail } from "@/lib/reservation/email-template";

const base = {
  code: "ARM-2026-AB12",
  unitName: "Casa Tatú",
  firstName: "Juan",
  checkIn: "2026-07-02",
  checkOut: "2026-07-05",
  nights: 3,
  guests: 4,
  total: 480000,
  miReservaUrl: "https://aruma.test/es/mi-reserva?code=ARM-2026-AB12",
} as const;

describe("buildConfirmationEmail", () => {
  it("genera subject/html/text para los 3 locales", () => {
    for (const locale of ["es", "en", "pt"] as const) {
      const out = buildConfirmationEmail({ ...base, locale });
      expect(out.subject).toContain("ARM-2026-AB12");
      expect(out.html).toContain("ARM-2026-AB12");
      expect(out.text).toContain("ARM-2026-AB12");
    }
  });

  it("incluye total, unidad y la URL a mi-reserva en el cuerpo", () => {
    const out = buildConfirmationEmail({ ...base, locale: "es" });
    expect(out.html).toContain("Casa Tatú");
    expect(out.html).toContain(base.miReservaUrl);
    expect(out.html).toContain("480.000"); // formato es-AR
    expect(out.text).toContain(base.miReservaUrl);
  });

  it("locale inválido cae a es", () => {
    // @ts-expect-error probamos un locale fuera del union
    const out = buildConfirmationEmail({ ...base, locale: "fr" });
    const es = buildConfirmationEmail({ ...base, locale: "es" });
    expect(out.subject).toBe(es.subject);
  });

  it("escapa HTML en campos del huésped (anti-inyección)", () => {
    const out = buildConfirmationEmail({
      ...base, locale: "es", firstName: "<script>x</script>", unitName: "<b>u</b>",
    });
    expect(out.html).not.toContain("<script>x</script>");
    expect(out.html).not.toContain("<b>u</b>");
    expect(out.html).toContain("&lt;script&gt;");
  });
});
