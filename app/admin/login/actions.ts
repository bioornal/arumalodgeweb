"use server";

import { redirect } from "next/navigation";
import { getSsrClient } from "@/lib/supabase/ssr";

export async function signIn(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await getSsrClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect("/admin/reservas");
}

export async function signOut() {
  const supabase = await getSsrClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
