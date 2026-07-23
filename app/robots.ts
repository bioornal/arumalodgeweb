import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Crawlers de motores de IA. Se los permite EXPLÍCITAMENTE: que el lodge
// aparezca citado cuando alguien pregunta por alojamiento en Puerto Iguazú vale
// más que el tráfico que se pierda por el contenido indexado.
const AI_CRAWLERS = [
  "GPTBot",          // OpenAI, entrenamiento
  "OAI-SearchBot",   // OpenAI, búsqueda en ChatGPT
  "ChatGPT-User",    // OpenAI, navegación en vivo
  "ClaudeBot",       // Anthropic
  "Claude-User",     // Anthropic, navegación en vivo
  "PerplexityBot",   // Perplexity
  "Google-Extended", // Gemini / Vertex
  "Applebot-Extended",
  "CCBot",           // Common Crawl (alimenta a varios)
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /admin y /api no tienen nada que indexar y exponen superficie.
        // /mi-reserva es una consulta privada por código + email.
        disallow: ["/admin", "/api", "/mi-reserva"],
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: ["/admin", "/api", "/mi-reserva"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
