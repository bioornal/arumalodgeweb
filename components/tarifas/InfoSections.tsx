import { useTranslations } from "next-intl";
import { SERVICES, DISTANCES, CHECK_IN, CHECK_OUT, PETS_ALLOWED } from "@/lib/site";

export function InfoSections() {
  const t = useTranslations("tarifas");

  const box: React.CSSProperties = { border: "1px solid #E7E0D4", borderRadius: 8, background: "#fff", padding: "24px 26px" };
  const heading: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: 22, margin: "0 0 14px", color: "#1D1D1D" };
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", color: "#3a352c", borderTop: "1px solid #efe9dd" };

  return (
    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
      <div style={box}>
        <h3 style={heading}>{t("services.title")}</h3>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {SERVICES.map((k) => (
            <li key={k} style={{ fontSize: 14, padding: "7px 0", color: "#3a352c", borderTop: "1px solid #efe9dd" }}>
              {t(`services.${k}`)}
            </li>
          ))}
        </ul>
      </div>

      <div style={box}>
        <h3 style={heading}>{t("distances.title")}</h3>
        {DISTANCES.map((d) => (
          <div key={d.key} style={row}>
            <span>{t(`distances.${d.key}`)}</span>
            <span style={{ color: "#9A7B4F" }}>{t("distances.km", { km: d.km })}</span>
          </div>
        ))}
      </div>

      <div style={box}>
        <h3 style={heading}>{t("conditions.title")}</h3>
        <div style={row}><span>{t("conditions.checkIn")}</span><span>{CHECK_IN}</span></div>
        <div style={row}><span>{t("conditions.checkOut")}</span><span>{CHECK_OUT}</span></div>
        <div style={row}><span>{t("conditions.pets")}</span><span>{PETS_ALLOWED ? t("conditions.petsYes") : t("conditions.petsNo")}</span></div>
        <div style={row}><span>{t("conditions.payment")}</span><span>{t("conditions.paymentCard")}</span></div>
      </div>
    </div>
  );
}
