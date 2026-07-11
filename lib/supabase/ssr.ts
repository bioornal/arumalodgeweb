import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente SSR para autenticación del panel admin (sesión en cookies).
export async function getSsrClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component sin permiso de escritura de cookies: el middleware refresca la sesión.
        }
      },
    },
  });
}
