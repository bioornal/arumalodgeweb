"use client";

import { useReducer, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { LangSwitcher } from "@/components/ui/LangSwitcher";
import { Stepper } from "./Stepper";
import { OrderSummary } from "./OrderSummary";
import { StepDatos } from "./StepDatos";
import { StepPago } from "./StepPago";
import { Confirmacion } from "./Confirmacion";
import { reservationReducer, hydrateState, canAdvance, initialState } from "@/lib/reservation/reducer";
import { parseCheckoutQuery, buildTarifasUrl } from "@/lib/reservation/search";

export function ReservaFlow() {
  const t = useTranslations("reservas");
  const router = useRouter();
  const searchParams = useSearchParams();

  const unit = searchParams.get("unit") ?? undefined;
  const checkIn = searchParams.get("checkIn") ?? undefined;
  const checkOut = searchParams.get("checkOut") ?? undefined;
  const guests = searchParams.get("guests") ?? undefined;
  const query = useMemo(
    () => parseCheckoutQuery({ unit, checkIn, checkOut, guests }),
    [unit, checkIn, checkOut, guests],
  );

  const [state, dispatch] = useReducer(
    reservationReducer,
    query,
    (q) => (q ? hydrateState(q) : initialState),
  );
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Guard: deep-link inválido → volver a tarifas.
  useEffect(() => {
    if (!query) router.replace("/tarifas");
  }, [query, router]);
  if (!query) return null;

  const nextLabels = t.raw("next") as Record<string, string>;
  const canGoNext = canAdvance(state);

  return (
    <div
      style={{
        fontFamily: "'Manrope', system-ui, sans-serif",
        color: "#1D1D1D",
        minHeight: "100vh",
      }}
    >
      {/* Minimal nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(248,245,240,.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid #E7E0D4",
        }}
      >
        <div
          className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-[14px] md:gap-5 md:px-12 md:py-[18px]"
        >
          <Link
            href="/"
            style={{
              color: "#1D1D1D",
              textDecoration: "none",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: 23,
              letterSpacing: ".34em",
              paddingLeft: ".34em",
              whiteSpace: "nowrap",
            }}
          >
            ARUMA
          </Link>
          <div className="flex items-center gap-4 md:gap-6">
            <LangSwitcher />
            <Link
              href="/"
              className="whitespace-nowrap"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "#6b665d",
                textDecoration: "none",
                fontSize: 13,
                letterSpacing: ".04em",
                transition: "color .25s",
              }}
            >
              {t("backToSite")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Stepper */}
      <Stepper step={state.step} />

      {/* Body */}
      <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-8 md:px-12 md:pb-[110px] md:pt-12">
        {state.step < 3 ? (
          <div className="mt-[18px] grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
            <div className="rounded-lg border border-[#E7E0D4] bg-white p-6 md:min-h-[440px] md:p-[38px]" style={{ boxShadow: "0 30px 70px -55px rgba(29,29,29,.45)" }}>
              {state.step === 1 && <StepDatos state={state} dispatch={dispatch} />}
              {state.step === 2 && (
                <StepPago
                  state={state}
                  onApproved={(c) => { setCode(c); setPending(false); dispatch({ type: "NEXT" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onPending={(c) => { setCode(c); setPending(true); dispatch({ type: "NEXT" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                />
              )}

              {/* Nav buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36, paddingTop: 26, borderTop: "1px solid #E7E0D4" }}>
                {state.step === 1 ? (
                  <Link href={buildTarifasUrl(query)} style={{ background: "transparent", border: "none", fontFamily: "'Manrope', sans-serif", fontSize: 13, color: "#6b665d", letterSpacing: ".04em", textDecoration: "none" }}>
                    {t("backBtn")}
                  </Link>
                ) : (
                  <button type="button" onClick={() => { dispatch({ type: "BACK" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Manrope', sans-serif", fontSize: 13, color: "#6b665d", letterSpacing: ".04em" }}>
                    {t("backBtn")}
                  </button>
                )}

                {state.step === 1 ? (
                  <button type="button" onClick={() => { if (canGoNext) { dispatch({ type: "NEXT" }); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
                    disabled={!canGoNext}
                    style={{ background: canGoNext ? "#A04B2A" : "#d8cdbd", color: "#F8F5F0", border: "none", cursor: canGoNext ? "pointer" : "not-allowed", fontFamily: "'Manrope', sans-serif", fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", padding: "15px 30px", borderRadius: 3, transition: "background .35s" }}>
                    {nextLabels["1"]}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </div>

            <div className="order-first lg:order-none lg:sticky lg:top-[100px]">
              <OrderSummary state={state} />
            </div>
          </div>
        ) : (
          <Confirmacion state={state} code={code ?? ""} pending={pending} />
        )}
      </div>
    </div>
  );
}
