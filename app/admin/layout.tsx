import type { ReactNode } from "react";
import { display, sans } from "@/lib/fonts";
import "../globals.css";

export const metadata = {
  title: "Panel — Aruma Lodge",
};

// Root layout independiente para /admin (fuera de [locale]): debe proveer <html>/<body>.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        <div
          style={{
            minHeight: "100vh",
            background: "#f8f5f0",
            fontFamily: "var(--font-sans)",
            color: "#1D1D1D",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
