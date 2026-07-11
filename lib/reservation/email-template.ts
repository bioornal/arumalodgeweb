export type EmailLocale = "es" | "en" | "pt";

export type ConfirmationEmailInput = {
  code: string;
  unitName: string;
  firstName: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guests: number;
  total: number;
  locale: EmailLocale;
  miReservaUrl: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

const LOCALE_TAG: Record<EmailLocale, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

type Copy = {
  subject: (code: string) => string;
  greeting: (name: string) => string;
  intro: string;
  labels: { code: string; unit: string; checkIn: string; checkOut: string; nights: string; guests: string; total: string };
  cta: string;
  outro: string;
  footer: string;
};

const COPY: Record<EmailLocale, Copy> = {
  es: {
    subject: (c) => `Reserva confirmada — ${c}`,
    greeting: (n) => `Hola ${n},`,
    intro: "Tu reserva en Aruma Lodge está confirmada. ¡Te esperamos!",
    labels: { code: "Código", unit: "Alojamiento", checkIn: "Check-in", checkOut: "Check-out", nights: "Noches", guests: "Huéspedes", total: "Total" },
    cta: "Ver mi reserva",
    outro: "Ante cualquier consulta, respondé este correo o escribinos por WhatsApp.",
    footer: "Aruma Lodge · Puerto Iguazú, Misiones",
  },
  en: {
    subject: (c) => `Booking confirmed — ${c}`,
    greeting: (n) => `Hi ${n},`,
    intro: "Your booking at Aruma Lodge is confirmed. We look forward to hosting you!",
    labels: { code: "Code", unit: "Accommodation", checkIn: "Check-in", checkOut: "Check-out", nights: "Nights", guests: "Guests", total: "Total" },
    cta: "View my booking",
    outro: "If you have any questions, reply to this email or message us on WhatsApp.",
    footer: "Aruma Lodge · Puerto Iguazú, Argentina",
  },
  pt: {
    subject: (c) => `Reserva confirmada — ${c}`,
    greeting: (n) => `Olá ${n},`,
    intro: "Sua reserva no Aruma Lodge está confirmada. Esperamos por você!",
    labels: { code: "Código", unit: "Acomodação", checkIn: "Check-in", checkOut: "Check-out", nights: "Noites", guests: "Hóspedes", total: "Total" },
    cta: "Ver minha reserva",
    outro: "Em caso de dúvidas, responda este e-mail ou fale conosco pelo WhatsApp.",
    footer: "Aruma Lodge · Puerto Iguazú, Argentina",
  },
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function fmtDate(iso: string, locale: EmailLocale): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function money(total: number): string {
  return `$${new Intl.NumberFormat("es-AR").format(total)}`;
}

export function buildConfirmationEmail(input: ConfirmationEmailInput): BuiltEmail {
  const locale: EmailLocale = (["es", "en", "pt"] as const).includes(input.locale)
    ? input.locale
    : "es";
  const t = COPY[locale];
  const name = esc(input.firstName);
  const unit = esc(input.unitName);
  const ci = fmtDate(input.checkIn, locale);
  const co = fmtDate(input.checkOut, locale);
  const tot = money(input.total);

  const rows: [string, string][] = [
    [t.labels.code, esc(input.code)],
    [t.labels.unit, unit],
    [t.labels.checkIn, ci],
    [t.labels.checkOut, co],
    [t.labels.nights, String(input.nights)],
    [t.labels.guests, String(input.guests)],
    [t.labels.total, tot],
  ];

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b665d;font-size:14px">${k}</td>` +
        `<td style="padding:8px 0;text-align:right;color:#23362B;font-size:14px;font-weight:600">${v}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#F8F5F0;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <h1 style="font-size:22px;color:#23362B;margin:0 0 4px">Aruma Lodge</h1>
  <p style="font-size:15px;color:#23362B;margin:18px 0 4px">${t.greeting(name)}</p>
  <p style="font-size:15px;color:#5b5347;line-height:1.6;margin:0 0 22px">${t.intro}</p>
  <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #ece5d8;border-radius:8px;padding:8px 18px">
    ${rowsHtml}
  </table>
  <div style="text-align:center;margin:26px 0">
    <a href="${input.miReservaUrl}" style="display:inline-block;background:#A04B2A;color:#F8F5F0;text-decoration:none;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:14px 28px;border-radius:4px">${t.cta}</a>
  </div>
  <p style="font-size:13px;color:#6b665d;line-height:1.6;margin:0 0 18px">${t.outro}</p>
  <p style="font-size:12px;color:#9a9388;border-top:1px solid #ece5d8;padding-top:16px;margin:0">${t.footer}</p>
</div>
</body></html>`;

  const textRows = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  const text = `${t.greeting(input.firstName)}\n\n${t.intro}\n\n${textRows}\n\n${t.cta}: ${input.miReservaUrl}\n\n${t.outro}\n${t.footer}`;

  return { subject: t.subject(input.code), html, text };
}
