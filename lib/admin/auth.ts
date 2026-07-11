import { getSsrClient } from "@/lib/supabase/ssr";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export type AdminUser = { email: string };

/** Devuelve el admin autenticado (email en la allowlist), o null. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await getSsrClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email || !isAdminEmail(data.user.email)) return null;
  return { email: data.user.email };
}
