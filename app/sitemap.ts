import type { MetadataRoute } from "next";
import { routing } from "@/lib/i18n/routing";
import { UNITS } from "@/lib/units";
import { absoluteUrl } from "@/lib/seo";

// Rutas públicas indexables. NO incluye /reservas (checkout, sin valor de
// búsqueda), /mi-reserva (privada) ni /admin.
const STATIC_PATHS = ["", "/tarifas", "/politicas/cancelacion", "/privacidad"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : path === "/tarifas" ? 0.9 : 0.3,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)]),
          ),
        },
      });
    }

    for (const unit of UNITS) {
      entries.push({
        url: absoluteUrl(`/${locale}/departamentos/${unit.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, absoluteUrl(`/${l}/departamentos/${unit.slug}`)]),
          ),
        },
      });
    }
  }

  return entries;
}
