"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { ReservationView } from "@/lib/reservation/lookup.server";
import { ReservaEstado } from "./ReservaEstado";

type UiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; view: ReservationView }
  | { kind: "notFound" }
  | { kind: "error" };

export function LookupForm() {
  const t = useTranslations("miReserva");
  const searchParams = useSearchParams();
  const [code, setCode] = useState(() => (searchParams.get("code") ?? "").toUpperCase());
  const [email, setEmail] = useState("");
  const [state, setState] = useState<UiState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/reservations/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, email }),
      });
      if (res.ok) {
        const { reservation } = (await res.json()) as { reservation: ReservationView };
        setState({ kind: "result", view: reservation });
      } else if (res.status === 404 || res.status === 400) {
        setState({ kind: "notFound" });
      } else {
        setState({ kind: "error" });
      }
    } catch {
      setState({ kind: "error" });
    }
  }

  if (state.kind === "result") {
    return (
      <ReservaEstado
        view={state.view}
        onReset={() => {
          setCode("");
          setEmail("");
          setState({ kind: "idle" });
        }}
      />
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#fff",
    border: "1px solid #d8d0c4",
    borderRadius: 4,
    padding: "12px 14px",
    fontSize: 15,
    color: "#1d1d1d",
    marginTop: 6,
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{ maxWidth: 460, margin: "24px auto 0", textAlign: "left" }}
    >
      <label style={{ display: "block", marginBottom: 16, fontSize: 13, color: "#5b5347" }}>
        {t("codeLabel")}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("codePlaceholder")}
          required
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 20, fontSize: 13, color: "#5b5347" }}>
        {t("emailLabel")}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          style={inputStyle}
        />
      </label>

      {state.kind === "notFound" && (
        <p style={{ color: "#a04b2a", fontSize: 14, margin: "0 0 16px" }}>{t("notFound")}</p>
      )}
      {state.kind === "error" && (
        <p style={{ color: "#a04b2a", fontSize: 14, margin: "0 0 16px" }}>{t("error")}</p>
      )}

      <button
        type="submit"
        disabled={state.kind === "loading"}
        style={{
          width: "100%",
          background: "#A04B2A",
          color: "#F8F5F0",
          border: "none",
          fontSize: 12.5,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          padding: "15px",
          borderRadius: 3,
          cursor: state.kind === "loading" ? "default" : "pointer",
          opacity: state.kind === "loading" ? 0.7 : 1,
        }}
      >
        {state.kind === "loading" ? t("loading") : t("submit")}
      </button>
    </form>
  );
}
