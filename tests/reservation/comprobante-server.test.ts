import { describe, it, expect, vi, beforeEach } from "vitest";

const upload = vi.fn();
const remove = vi.fn();
const createSignedUrl = vi.fn();
const fromStorage = vi.fn(() => ({ upload, remove, createSignedUrl }));

vi.mock("@/lib/supabase/server", () => ({
  getServiceClient: () => ({ storage: { from: fromStorage } }),
}));

import { uploadComprobante, signComprobanteUrl, extFor, ALLOWED_MIME } from "@/lib/reservation/comprobante.server";

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null });
});

describe("comprobante.server", () => {
  it("extFor mapea mime → extensión", () => {
    expect(extFor("image/jpeg")).toBe("jpg");
    expect(extFor("image/png")).toBe("png");
    expect(extFor("image/webp")).toBe("webp");
    expect(extFor("application/pdf")).toBe("pdf");
  });

  it("ALLOWED_MIME contiene los 4 tipos", () => {
    expect(ALLOWED_MIME).toContain("image/jpeg");
    expect(ALLOWED_MIME).toContain("application/pdf");
  });

  it("uploadComprobante sube a comprobantes/<code>/... y devuelve el path", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "c.jpg", { type: "image/jpeg" });
    const path = await uploadComprobante("ARM-2026-AB12", file);
    expect(fromStorage).toHaveBeenCalledWith("comprobantes");
    expect(path).toMatch(/^ARM-2026-AB12\/.+\.jpg$/);
    expect(upload).toHaveBeenCalledOnce();
  });

  it("uploadComprobante lanza si Storage falla", async () => {
    upload.mockResolvedValueOnce({ error: { message: "no" } });
    const file = new File([new Uint8Array([1])], "c.pdf", { type: "application/pdf" });
    await expect(uploadComprobante("ARM-2026-AB12", file)).rejects.toThrow();
  });

  it("signComprobanteUrl devuelve la signed URL", async () => {
    const url = await signComprobanteUrl("ARM/x.jpg");
    expect(url).toBe("https://signed");
    expect(createSignedUrl).toHaveBeenCalledWith("ARM/x.jpg", 300);
  });
});
