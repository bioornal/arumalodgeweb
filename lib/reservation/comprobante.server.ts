import crypto from "node:crypto";
import { getServiceClient } from "@/lib/supabase/server";

const BUCKET = "comprobantes";
export const MAX_BYTES = 6 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

const EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extFor(mime: string): string {
  return EXT[mime as AllowedMime] ?? "bin";
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

/** Sube el archivo a comprobantes/<code>/<uuid>.<ext>. Devuelve el path. Lanza si falla. */
export async function uploadComprobante(code: string, file: File): Promise<string> {
  const ext = extFor(file.type);
  const path = `${code}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await getServiceClient()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(`uploadComprobante: ${error.message}`);
  return path;
}

/** Borra un comprobante (best-effort; no lanza). */
export async function removeComprobante(path: string): Promise<void> {
  try {
    await getServiceClient().storage.from(BUCKET).remove([path]);
  } catch {
    /* best-effort */
  }
}

/** Signed URL de corta duración (300s) para mostrar el comprobante en el panel. */
export async function signComprobanteUrl(path: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
