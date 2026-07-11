import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/ssr", () => ({
  getSsrClient: async () => ({ auth: { getUser } }),
}));

import { isAdminEmail, getAdminUser } from "@/lib/admin/auth";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_EMAILS = "spezialichristian@gmail.com, otro@aruma.com";
});
afterEach(() => { delete process.env.ADMIN_EMAILS; });

describe("admin auth", () => {
  it("isAdminEmail respeta la allowlist (case-insensitive, trim)", () => {
    expect(isAdminEmail("spezialichristian@gmail.com")).toBe(true);
    expect(isAdminEmail("SPEZIALICHRISTIAN@gmail.com")).toBe(true);
    expect(isAdminEmail("otro@aruma.com")).toBe(true);
    expect(isAdminEmail("intruso@x.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });

  it("getAdminUser devuelve el email si hay sesión y está en la allowlist", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "otro@aruma.com" } }, error: null });
    expect(await getAdminUser()).toEqual({ email: "otro@aruma.com" });
  });

  it("getAdminUser devuelve null si no hay sesión", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getAdminUser()).toBeNull();
  });

  it("getAdminUser devuelve null si el email no está autorizado", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "intruso@x.com" } }, error: null });
    expect(await getAdminUser()).toBeNull();
  });
});
