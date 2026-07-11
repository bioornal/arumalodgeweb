import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./lib/i18n/routing";

const intl = createMiddleware(routing);

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

async function guardAdmin(req: NextRequest): Promise<NextResponse> {
  // /admin/login es público (el formulario).
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const ok = !!email && allow.includes(email);

  if (ok) return res;
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export default function middleware(req: NextRequest) {
  if (isAdminPath(req.nextUrl.pathname)) return guardAdmin(req);
  return intl(req);
}

export const config = {
  // El patrón general SIGUE excluyendo /api (para no correr next-intl sobre /api/payments, etc.),
  // pero NO excluye /admin → así /admin/* entra al middleware y lo desvía guardAdmin.
  // /api/admin se agrega explícito como segunda entrada.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/admin/:path*"],
};
