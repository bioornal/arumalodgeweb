import { useTranslations } from "next-intl";

interface StepperProps {
  step: number;
}

export function Stepper({ step }: StepperProps) {
  const t = useTranslations("reservas");
  const titles = t.raw("titles") as string[];
  const steps = t.raw("steps") as string[];

  return (
    <div className="max-w-[1280px] mx-auto px-5 md:px-12 pt-8 md:pt-11">
      {/* Kicker */}
      <div className="text-[12px] tracking-[0.26em] uppercase text-bronce text-center">
        {t("directKicker")}
      </div>

      {/* Dynamic title */}
      <h1 className="font-display font-normal text-[clamp(30px,4vw,52px)] text-center tracking-[-0.01em] mt-3 mb-0">
        {titles[step] ?? ""}
      </h1>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-0 mt-9 mx-auto max-w-[680px]">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={n} className="flex items-center flex-1">
              <div className="flex items-center gap-[11px]">
                {/* Dot */}
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    transition: "all .3s",
                    background: done ? "#23362B" : active ? "#A04B2A" : "transparent",
                    color: done || active ? "#F8F5F0" : "#9b8e79",
                    border: done || active ? "1px solid transparent" : "1px solid #c9bfae",
                  }}
                >
                  {done ? "✓" : String(n)}
                </span>
                {/* Label */}
                <span
                  style={{
                    fontSize: 13,
                    letterSpacing: ".03em",
                    whiteSpace: "nowrap",
                    color: active ? "#1D1D1D" : "#9b8e79",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
              {/* Bar between steps */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    margin: "0 14px",
                    background: step > n ? "#23362B" : "#D8CFBF",
                    transition: "background .3s",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
