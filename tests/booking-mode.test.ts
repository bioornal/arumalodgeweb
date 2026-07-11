import { describe, it, expect, afterEach } from "vitest";
import { isWhatsAppBookingMode } from "@/lib/booking-mode";
import { waLink, WHATSAPP_NUMBER } from "@/lib/contact";

const ORIGINAL = process.env.NEXT_PUBLIC_BOOKING_MODE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_BOOKING_MODE;
  else process.env.NEXT_PUBLIC_BOOKING_MODE = ORIGINAL;
});

describe("isWhatsAppBookingMode", () => {
  it("es false sin la variable", () => {
    delete process.env.NEXT_PUBLIC_BOOKING_MODE;
    expect(isWhatsAppBookingMode()).toBe(false);
  });

  it("es true solo con el valor exacto 'whatsapp'", () => {
    process.env.NEXT_PUBLIC_BOOKING_MODE = "whatsapp";
    expect(isWhatsAppBookingMode()).toBe(true);
    process.env.NEXT_PUBLIC_BOOKING_MODE = "online";
    expect(isWhatsAppBookingMode()).toBe(false);
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
    expect(WHATSAPP_NUMBER).toBe("5493757419667");
  });
});
