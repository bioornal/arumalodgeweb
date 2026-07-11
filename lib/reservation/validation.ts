// Validación de email compartida entre el gate de la UI (reducer.canAdvance paso 1 / Datos)
// y el guard del route POST /api/payments. Único origen para que el contrato
// no derive entre cliente y servidor. Patrón laxo a propósito (no RFC completo).
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}
