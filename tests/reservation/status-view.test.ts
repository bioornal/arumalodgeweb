import { describe, it, expect } from "vitest";
import { resolveStatusKey } from "@/lib/reservation/status-view";

describe("resolveStatusKey", () => {
  it("released → cancelled (cualquier método)", () => {
    expect(resolveStatusKey("released", "card")).toBe("cancelled");
    expect(resolveStatusKey("released", "transfer")).toBe("cancelled");
  });
  it("confirmed → confirmed", () => {
    expect(resolveStatusKey("confirmed", "card")).toBe("confirmed");
    expect(resolveStatusKey("confirmed", "transfer")).toBe("confirmed");
  });
  it("pending + transfer → inVerification", () => {
    expect(resolveStatusKey("pending", "transfer")).toBe("inVerification");
  });
  it("pending + card → paymentPending", () => {
    expect(resolveStatusKey("pending", "card")).toBe("paymentPending");
  });
});
