import { describe, it, expect } from "vitest";
import {
  initialState,
  reservationReducer,
  canAdvance,
  guestDataValid,
  hydrateState,
  type State,
} from "@/lib/reservation/reducer";

describe("reservationReducer (checkout 3 pasos)", () => {
  it("estado inicial: step 1, 2 huéspedes, unidad yvyra, sin fechas", () => {
    expect(initialState).toMatchObject({ step: 1, guests: 2, unitId: "yvyra", checkIn: null, checkOut: null });
  });

  it("hydrateState arma el estado desde la query del checkout", () => {
    const s = hydrateState({ unitId: "tatu", checkIn: "2026-07-02", checkOut: "2026-07-05", guests: 4 });
    expect(s).toMatchObject({ step: 1, unitId: "tatu", guests: 4 });
    expect(s.checkIn).toEqual(new Date(2026, 6, 2));
    expect(s.checkOut).toEqual(new Date(2026, 6, 5));
  });

  it("SET_GUEST_FIELD setea cada campo del huésped", () => {
    let s = reservationReducer(initialState, { type: "SET_GUEST_FIELD", field: "firstName", value: "Ana" });
    s = reservationReducer(s, { type: "SET_GUEST_FIELD", field: "lastName", value: "Gómez" });
    s = reservationReducer(s, { type: "SET_GUEST_FIELD", field: "email", value: "ana@t.com" });
    s = reservationReducer(s, { type: "SET_GUEST_FIELD", field: "phone", value: "+54" });
    expect(s).toMatchObject({ firstName: "Ana", lastName: "Gómez", email: "ana@t.com", phone: "+54" });
  });

  it("guestDataValid exige nombre, apellido y email válido (teléfono opcional)", () => {
    expect(guestDataValid(initialState)).toBe(false);
    expect(guestDataValid({ ...initialState, firstName: "Ana", lastName: "Gómez", email: "ana@t.com" })).toBe(true);
    expect(guestDataValid({ ...initialState, firstName: "Ana", lastName: "Gómez", email: "no-email" })).toBe(false);
    expect(guestDataValid({ ...initialState, firstName: "Ana", lastName: "", email: "ana@t.com" })).toBe(false);
  });

  it("canAdvance: paso 1 (Datos) requiere datos válidos; otros pasos true", () => {
    expect(canAdvance({ ...initialState, step: 1 })).toBe(false);
    expect(canAdvance({ ...initialState, step: 1, firstName: "Ana", lastName: "Gómez", email: "ana@t.com" })).toBe(true);
    expect(canAdvance({ ...initialState, step: 2 })).toBe(true);
  });

  it("NEXT no avanza desde Datos sin datos válidos; sí con datos; clampa en 3", () => {
    expect(reservationReducer({ ...initialState, step: 1 }, { type: "NEXT" }).step).toBe(1);
    const ok: State = { ...initialState, step: 1, firstName: "Ana", lastName: "Gómez", email: "ana@t.com" };
    expect(reservationReducer(ok, { type: "NEXT" }).step).toBe(2);
    expect(reservationReducer({ ...initialState, step: 3 }, { type: "NEXT" }).step).toBe(3);
  });

  it("BACK no baja de 1", () => {
    expect(reservationReducer({ ...initialState, step: 1 }, { type: "BACK" }).step).toBe(1);
    expect(reservationReducer({ ...initialState, step: 3 }, { type: "BACK" }).step).toBe(2);
  });
});
