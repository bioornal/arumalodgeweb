import { isValidEmail } from "./validation";
import { parseDateOnly } from "./booking";
import type { CheckoutQuery } from "./search";

export type UnitId = "yvyra" | "mberu" | "tatu";
export type GuestField = "firstName" | "lastName" | "email" | "phone";
export type State = {
  step: 1 | 2 | 3;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  unitId: UnitId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};
export type Action =
  | { type: "SET_GUEST_FIELD"; field: GuestField; value: string }
  | { type: "NEXT" }
  | { type: "BACK" };

export const initialState: State = {
  step: 1,
  checkIn: null,
  checkOut: null,
  guests: 2,
  unitId: "yvyra",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

/** Estado inicial del checkout, hidratado desde la URL (unidad + fechas + huéspedes). */
export function hydrateState(q: CheckoutQuery): State {
  return {
    ...initialState,
    unitId: q.unitId,
    guests: q.guests,
    checkIn: parseDateOnly(q.checkIn),
    checkOut: parseDateOnly(q.checkOut),
  };
}

export function guestDataValid(s: State): boolean {
  return s.firstName.trim() !== "" && s.lastName.trim() !== "" && isValidEmail(s.email);
}

export function canAdvance(s: State): boolean {
  if (s.step === 1) return guestDataValid(s);
  return true;
}

export function reservationReducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_GUEST_FIELD":
      return { ...state, [action.field]: action.value };
    case "NEXT":
      return canAdvance(state)
        ? { ...state, step: Math.min(3, state.step + 1) as State["step"] }
        : state;
    case "BACK":
      return { ...state, step: Math.max(1, state.step - 1) as State["step"] };
    default:
      return state;
  }
}
