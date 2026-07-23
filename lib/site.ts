// Datos estáticos del lodge para la página de tarifas.
// PLACEHOLDERS: el dueño confirma km reales, horarios y política de mascotas.

export type DistanceKey = "airport" | "falls" | "downtown";
export const DISTANCES: { key: DistanceKey; km: number }[] = [
  { key: "airport", km: 20 },
  { key: "falls", km: 18 },
  { key: "downtown", km: 6 },
];

export const CHECK_IN = "15:00";
export const CHECK_OUT = "11:00";
export const PETS_ALLOWED = false;

// Servicios mostrados (las etiquetas viven en i18n: tarifas.services.<key>).
export type ServiceKey = "wifi" | "ac" | "kitchen" | "reception" | "parking" | "linens";
export const SERVICES: ServiceKey[] = ["wifi", "ac", "kitchen", "reception", "parking", "linens"];

// Datos bancarios para pago por transferencia. NEXT_PUBLIC_ porque se leen
// client-side (son datos públicos para que el huésped transfiera).
//
// OJO con `??`: NO se dispara con string vacío. Una env var declarada y vacía en
// Netlify daría "" en vez del placeholder, y el huésped vería el campo del CBU en
// blanco. envOrDefault trata vacío y espacios como ausente.
const PLACEHOLDER_CBU = "0000000000000000000000";

function envOrDefault(raw: string | undefined, fallback: string): string {
  const v = (raw ?? "").trim();
  return v === "" ? fallback : v;
}

export const BANK_DETAILS = {
  alias: envOrDefault(process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS, "ARUMA.LODGE.IGUAZU"),
  cbu: envOrDefault(process.env.NEXT_PUBLIC_ARUMA_BANK_CBU, PLACEHOLDER_CBU),
  holder: envOrDefault(process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER, "Aruma Lodge"),
};

/**
 * true solo si los tres datos bancarios REALES están cargados.
 * El paso de transferencia lo usa para no mostrarle al huésped un CBU inválido:
 * es preferible avisar que el método no está disponible.
 */
export function bankDetailsConfigured(): boolean {
  return (
    BANK_DETAILS.cbu !== PLACEHOLDER_CBU &&
    BANK_DETAILS.alias !== "ARUMA.LODGE.IGUAZU" &&
    BANK_DETAILS.holder !== "Aruma Lodge"
  );
}
