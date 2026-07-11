import { Resend } from "resend";
import { markConfirmationEmailSent } from "@/lib/reservation/reservations.server";
import { buildConfirmationEmail, type EmailLocale } from "@/lib/reservation/email-template";

function normLocale(v: unknown): EmailLocale {
  return v === "en" || v === "pt" ? v : "es";
}

/**
 * Envía el email de confirmación al huésped, exactamente una vez por reserva.
 * - Deduplica vía markConfirmationEmailSent (flip atómico).
 * - Fail-soft: cualquier error se loguea y NO se propaga.
 * - Sin RESEND_API_KEY: no-op (no marca, para no perder el envío al configurar).
 */
export async function sendConfirmationEmailOnce(code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY ausente; no se envía confirmación (code ${code})`);
    return;
  }

  try {
    const row = await markConfirmationEmailSent(code);
    if (!row) return; // ya enviado o code inexistente

    const locale = normLocale(row.locale);
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const miReservaUrl = `${base}/${locale}/mi-reserva?code=${encodeURIComponent(row.code)}`;

    const { subject, html, text } = buildConfirmationEmail({
      code: row.code,
      unitName: row.unit_name,
      firstName: row.first_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      guests: row.guests,
      total: row.total,
      locale,
      miReservaUrl,
    });

    const resend = new Resend(apiKey);
    const from = process.env.ARUMA_EMAIL_FROM ?? "Aruma Lodge <onboarding@resend.dev>";
    const { error } = await resend.emails.send({ from, to: row.email, subject, html, text });
    if (error) console.error(`[email] Resend error (code ${code}):`, error);
  } catch (err) {
    console.error(`[email] envío fallo (code ${code}):`, err instanceof Error ? err.message : err);
  }
}
