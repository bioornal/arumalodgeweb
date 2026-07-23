import { describe, it, expect, afterEach } from "vitest";
import { isWhatsAppBookingMode, resolveBookingMode } from "@/lib/booking-mode";
import { waLink, WHATSAPP_NUMBER } from "@/lib/contact";

const ORIGINAL = process.env.NEXT_PUBLIC_BOOKING_MODE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_BOOKING_MODE;
  else process.env.NEXT_PUBLIC_BOOKING_MODE = ORIGINAL;
});

describe("resolveBookingMode", () => {
  it("sin env var manda la DB", () => {
    delete process.env.NEXT_PUBLIC_BOOKING_MODE;
    expect(resolveBookingMode("online")).toBe("online");
    expect(resolveBookingMode("whatsapp")).toBe("whatsapp");
  });

  it("la env var es kill-switch: le gana a la DB en ambas direcciones", () => {
    process.env.NEXT_PUBLIC_BOOKING_MODE = "whatsapp";
    expect(resolveBookingMode("online")).toBe("whatsapp");
    process.env.NEXT_PUBLIC_BOOKING_MODE = "online";
    expect(resolveBookingMode("whatsapp")).toBe("online");
  });

  it("una env var con un valor que no es un modo válido se ignora", () => {
    for (const v of ["", "1", "off", "WHATSAPP"]) {
      process.env.NEXT_PUBLIC_BOOKING_MODE = v;
      expect(resolveBookingMode("online")).toBe("online");
    }
  });
});

describe("isWhatsAppBookingMode", () => {
  it("es true solo para el modo whatsapp", () => {
    expect(isWhatsAppBookingMode("whatsapp")).toBe(true);
    expect(isWhatsAppBookingMode("online")).toBe(false);
  });
});

describe("waLink", () => {
  it("sin mensaje devuelve el link pelado", () => {
    expect(waLink()).toBe(`https://wa.me/${WHATSAPP_NUMBER}`);
  });

  it("con mensaje lo urlencodea en ?text=", () => {
    const url = waLink("Hola! Quiero reservar Suite Yvyrá del 15 jul al 18 jul");
    expect(url).toBe(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Quiero reservar Suite Yvyrá del 15 jul al 18 jul")}`,
    );
    expect(url).not.toContain(" ");
  });

  it("el número es el real del lodge", () => {
    expect(WHATSAPP_NUMBER).toBe("5493757652002");
  });
});
