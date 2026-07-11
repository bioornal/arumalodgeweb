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

// Datos bancarios para pago por transferencia. NEXT_PUBLIC_ porque se leen client-side
// (son datos públicos para que el huésped transfiera).
export const BANK_DETAILS = {
  alias: process.env.NEXT_PUBLIC_ARUMA_BANK_ALIAS ?? "ARUMA.LODGE.IGUAZU",
  cbu: process.env.NEXT_PUBLIC_ARUMA_BANK_CBU ?? "0000000000000000000000",
  holder: process.env.NEXT_PUBLIC_ARUMA_BANK_HOLDER ?? "Aruma Lodge",
};
