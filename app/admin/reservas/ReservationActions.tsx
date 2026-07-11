"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReservationActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: "confirm" | "release") => {
    setBusy(true);
    const res = await fetch(`/api/admin/reservations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("No se pudo completar la acción.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" disabled={busy} onClick={() => act("confirm")}
        style={{ padding: "9px 16px", background: "#23362B", color: "#F8F5F0", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 12.5 }}>
        Confirmar
      </button>
      <button type="button" disabled={busy} onClick={() => act("release")}
        style={{ padding: "9px 16px", background: "transparent", color: "#8a3b1d", border: "1px solid #e0b9a6", borderRadius: 3, cursor: "pointer", fontSize: 12.5 }}>
        Liberar
      </button>
    </div>
  );
}
