// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Código de reserva `ARM-{año}-{XXXX}` con 4 caracteres alfanuméricos no ambiguos.
 * `rand` se inyecta para tests deterministas (por defecto Math.random).
 */
export function generateBookingCode(
  year: number = new Date().getFullYear(),
  rand: () => number = Math.random,
): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    // min(...) blinda el caso borde rand()===1 (Math.random nunca lo devuelve,
    // pero un rand inyectado sí podría → índice fuera de rango).
    const idx = Math.min(ALPHABET.length - 1, Math.floor(rand() * ALPHABET.length));
    suffix += ALPHABET[idx];
  }
  return `ARM-${year}-${suffix}`;
}
