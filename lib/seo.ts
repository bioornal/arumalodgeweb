// Fuente de verdad de la URL pública del sitio.
//
// Todo lo que emite URLs absolutas —canonical, hreflang, sitemap, OG, JSON-LD—
// pasa por acá. El día que se conecte un dominio propio es cambiar
// NEXT_PUBLIC_SITE_URL en Netlify y redeployar: cero cambios de código.

const FALLBACK = "https://aruma-lodge.netlify.app";

function normalize(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (v === "") return FALLBACK;
  return v.replace(/\/+$/, "");
}

export const SITE_URL = normalize(process.env.NEXT_PUBLIC_SITE_URL);

/** URL absoluta a partir de un path del sitio. `/` devuelve la raíz sin barra. */
export function absoluteUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return clean === "" ? SITE_URL : `${SITE_URL}/${clean}`;
}
