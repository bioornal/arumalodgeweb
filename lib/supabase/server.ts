import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Solo server. Usa la service role key (bypassa RLS). Nunca importar desde "use client".

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role no configurado");
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
