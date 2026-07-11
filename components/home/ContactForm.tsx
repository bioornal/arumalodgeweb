"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";

const inputCls =
  "w-full rounded-[3px] font-sans text-[14px] text-carbon outline-none transition-[border-color] duration-[250ms] focus:border-bronce";

const inputStyle = {
  background: "#FBF9F5",
  border: "1px solid #d3c9b8",
  padding: "14px 16px",
};

export function ContactForm() {
  const t = useTranslations("contacto");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      noValidate
    >
      {/* Row 1: Nombre + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("form.name")}</span>
          <input
            type="text"
            placeholder={t("form.name")}
            required
            aria-label={t("form.name")}
            className={inputCls}
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("form.email")}</span>
          <input
            type="email"
            placeholder={t("form.email")}
            required
            aria-label={t("form.email")}
            className={inputCls}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Row 2: Teléfono + Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("form.phone")}</span>
          <input
            type="tel"
            placeholder={t("form.phone")}
            aria-label={t("form.phone")}
            className={inputCls}
            style={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="sr-only">{t("form.dates")}</span>
          <input
            type="text"
            placeholder={t("form.dates")}
            aria-label={t("form.dates")}
            className={inputCls}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Textarea */}
      <label className="flex flex-col gap-1">
        <span className="sr-only">{t("form.message")}</span>
        <textarea
          rows={4}
          placeholder={t("form.message")}
          required
          aria-label={t("form.message")}
          className={inputCls}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      {/* Submit */}
      <div style={{ marginTop: 4 }}>
        <button
          type="submit"
          className="font-sans text-[12.5px] uppercase tracking-[0.1em] rounded-[2px] transition-[background,transform] duration-300 hover:bg-terracota-hover hover:-translate-y-0.5 cursor-pointer"
          style={{
            background: "#A04B2A",
            color: "#F8F5F0",
            border: "none",
            padding: "15px 38px",
          }}
        >
          {sent ? t("form.sent") : t("form.submit")}
        </button>
      </div>

      {/* Success message */}
      {sent && (
        <div
          style={{
            fontSize: 13,
            color: "#2f6b46",
            letterSpacing: "0.02em",
          }}
        >
          {t("form.sentMsg")}
        </div>
      )}
    </form>
  );
}
