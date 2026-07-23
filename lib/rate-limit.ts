// Rate limit best-effort por IP, en memoria del proceso.
//
// LIMITACIÓN CONOCIDA: en serverless el contador es POR INSTANCIA, así que no es
// una garantía dura — un atacante distribuido o un escalado agresivo lo diluyen.
// Alcanza para el volumen de un lodge de 3 unidades y para frenar el abuso obvio
// (scripts, reintentos en loop, subida masiva de comprobantes). Si algún día hace
// falta algo serio, el reemplazo es un contador en Supabase o un KV externo.

type Bucket = { count: number; reset: number };

const scopes = new Map<string, Map<string, Bucket>>();

/** Solo para tests: limpia todos los contadores. */
export function resetRateLimits(): void {
  scopes.clear();
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0].trim() : "unknown";
}

/**
 * Registra un hit y devuelve true si hay que rechazarlo.
 * `scope` separa contadores por endpoint: saturar el checkout no debe
 * bloquear la consulta de reserva.
 */
export function rateLimited(scope: string, ip: string, max: number, windowMs: number): boolean {
  let bucket = scopes.get(scope);
  if (!bucket) {
    bucket = new Map();
    scopes.set(scope, bucket);
  }

  const now = Date.now();
  const entry = bucket.get(ip);
  if (!entry || now > entry.reset) {
    bucket.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
