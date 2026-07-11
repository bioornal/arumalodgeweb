"use client";

import { useLocale } from "next-intl";
import { es as esLocale, enUS, ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { pickDay, type RangeValue } from "@/lib/reservation/range";

interface RangeCalendarProps {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
}

export function RangeCalendar({ value, onChange }: RangeCalendarProps) {
  const locale = useLocale();
  const dateFnsLocale =
    locale === "en" ? enUS : locale === "pt" ? ptBR : esLocale;
  const { checkIn, checkOut } = value;

  const modifiers = {
    rangeStart: checkIn ? [checkIn] : [],
    rangeEnd: checkOut ? [checkOut] : [],
    rangeMiddle: (day: Date) => !!checkIn && !!checkOut && day > checkIn && day < checkOut,
  };
  const modifiersClassNames = {
    rangeStart: "rdp-aruma-end",
    rangeEnd: "rdp-aruma-end",
    rangeMiddle: "rdp-aruma-middle",
  };

  return (
    <DayPicker
      locale={dateFnsLocale}
      defaultMonth={checkIn ?? new Date()}
      weekStartsOn={1}
      disabled={{ before: new Date() }}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      onDayClick={(day) => onChange(pickDay(value, day))}
    />
  );
}
