"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { es as esLocale, enUS, ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { useRouter } from "@/lib/i18n/navigation";
import { formatDateOnly, parseDateOnly } from "@/lib/reservation/booking";
import { buildTarifasUrl } from "@/lib/reservation/search";
import { Reveal } from "@/components/motion/Reveal";

interface SearchWidgetProps {
  variant: "hero" | "bar";
  initial?: { checkIn: string; checkOut: string; guests: number };
}

export function SearchWidget({ variant, initial }: SearchWidgetProps) {
  const t = useTranslations("searchWidget");
  const locale = useLocale();
  const router = useRouter();
  const dateFnsLocale =
    locale === "en" ? enUS : locale === "pt" ? ptBR : esLocale;
  const [checkIn, setCheckIn] = useState<Date | null>(() =>
    initial ? parseDateOnly(initial.checkIn) : null,
  );
  const [checkOut, setCheckOut] = useState<Date | null>(() =>
    initial ? parseDateOnly(initial.checkOut) : null,
  );
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [open, setOpen] = useState<null | "arrival" | "departure">(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const valid = checkIn !== null && checkOut !== null;
  const fmtDate = (d: Date | null) => (d ? format(d, "dd/MM/yyyy") : t("select"));

  function pickArrival(day: Date) {
    setCheckIn(day);
    setCheckOut(null);
    setOpen("departure");
  }

  function pickDeparture(day: Date) {
    if (checkIn && day > checkIn) {
      setCheckOut(day);
      setOpen(null);
    }
  }

  function clickArrival() {
    setOpen(open === "arrival" ? null : "arrival");
  }

  function clickDeparture() {
    if (!checkIn) {
      setOpen("arrival");
      return;
    }
    setOpen(open === "departure" ? null : "departure");
  }

  function submit() {
    if (!valid) return;
    router.push(
      buildTarifasUrl({
        checkIn: formatDateOnly(checkIn!),
        checkOut: formatDateOnly(checkOut!),
        guests,
      }),
    );
  }

  const wrapperClass =
    variant === "hero"
      ? "relative z-20 max-w-[1020px] mx-auto px-5 md:px-12"
      : "relative z-20 max-w-[1020px] mx-auto px-5 md:px-6";

  const wrapperStyle: React.CSSProperties =
    variant === "hero"
      ? { marginTop: "-52px" }
      : { marginTop: 0 };

  const label: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: ".2em",
    textTransform: "uppercase",
    color: "#9A7B4F",
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 21,
    color: "#1D1D1D",
    marginTop: 5,
  };
  // Mobile: modal centrado con backdrop (el popover quedaba cortado por la nav fija).
  // Desktop (sm+): popover anclado que abre hacia arriba, como antes.
  const popoverClass =
    "fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#E7E0D4] bg-white p-3 shadow-[0_30px_70px_-45px_rgba(29,29,29,.5)] " +
    "sm:absolute sm:left-0 sm:top-auto sm:bottom-[calc(100%+8px)] sm:translate-x-0 sm:translate-y-0 sm:p-[18px]";

  const backdrop = (
    <div
      className="fixed inset-0 z-[60] bg-black/40 sm:hidden"
      onClick={() => setOpen(null)}
      aria-hidden="true"
    />
  );

  return (
    <Reveal delay={0.05}>
      <div className={wrapperClass} style={wrapperStyle}>
        <div
          className="flex flex-wrap items-stretch rounded-[4px] border border-[#E7E0D4] bg-marfil"
          style={{ boxShadow: "0 40px 80px -50px rgba(29,29,29,.6)" }}
        >
          {/* Grupo Llegada + Salida — popovers separados que abren hacia arriba */}
          <div className="relative flex flex-1 min-w-[220px]" style={{ flexBasis: "320px" }}>
            <button
              type="button"
              onClick={clickArrival}
              className="flex-1 text-left bg-transparent border-none cursor-pointer"
              style={{ padding: "18px 24px", borderRight: "1px solid #E7E0D4" }}
            >
              <div style={label}>{t("arrival")}</div>
              <div style={valueStyle}>{fmtDate(checkIn)}</div>
            </button>
            <button
              type="button"
              onClick={clickDeparture}
              className="flex-1 text-left bg-transparent border-none cursor-pointer"
              style={{ padding: "18px 24px" }}
            >
              <div style={label}>{t("departure")}</div>
              <div style={valueStyle}>{fmtDate(checkOut)}</div>
            </button>

            {open === "arrival" && (
              <>
                {backdrop}
                <div className={popoverClass} onClick={(e) => e.stopPropagation()}>
                  <DayPicker
                    locale={dateFnsLocale}
                    defaultMonth={checkIn ?? new Date()}
                    weekStartsOn={1}
                    disabled={{ before: new Date() }}
                    modifiers={{ picked: checkIn ? [checkIn] : [] }}
                    modifiersClassNames={{ picked: "rdp-aruma-end" }}
                    onDayClick={pickArrival}
                  />
                </div>
              </>
            )}

            {open === "departure" && checkIn && (
              <>
                {backdrop}
                <div className={popoverClass} onClick={(e) => e.stopPropagation()}>
                  <DayPicker
                    locale={dateFnsLocale}
                    defaultMonth={checkIn}
                    weekStartsOn={1}
                    disabled={{ before: checkIn }}
                    modifiers={{ picked: checkOut ? [checkOut] : [] }}
                    modifiersClassNames={{ picked: "rdp-aruma-end" }}
                    onDayClick={pickDeparture}
                  />
                </div>
              </>
            )}
          </div>

          {/* Separador vertical para guests */}
          <div className="hidden sm:block w-px self-stretch bg-[#E7E0D4]" />

          {/* Huéspedes */}
          <div
            className="relative flex-1 min-w-[180px]"
            style={{ padding: "18px 24px" }}
          >
            <div style={label}>{t("guests")}</div>
            <div className="flex items-center justify-between" style={{ marginTop: 5 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21 }}>
                {guests} {guests === 1 ? t("guest") : t("guestsPlural")}
              </span>
              <span className="flex gap-[10px]">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  style={roundBtn}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setGuests((g) => Math.min(6, g + 1))}
                  style={roundBtn}
                >
                  +
                </button>
              </span>
            </div>
          </div>

          {/* CTA — ancho completo en mobile */}
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className="group/btn flex items-center justify-center gap-[10px] w-full sm:w-auto border-none px-9 py-4 text-[12.5px] uppercase tracking-[.16em] transition-[background] duration-300"
            style={{
              flex: "0 0 auto",
              cursor: valid ? "pointer" : "not-allowed",
              background: valid ? "#1D1D1D" : "#bdb4a4",
              color: "#F8F5F0",
            }}
            onMouseEnter={(e) => {
              if (valid) e.currentTarget.style.background = "#A04B2A";
            }}
            onMouseLeave={(e) => {
              if (valid) e.currentTarget.style.background = "#1D1D1D";
            }}
          >
            {t("cta")}
          </button>
        </div>
      </div>
    </Reveal>
  );
}

const roundBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "1px solid #c9bfae",
  background: "#fff",
  cursor: "pointer",
  fontSize: 17,
  color: "#1D1D1D",
  lineHeight: 1,
};
