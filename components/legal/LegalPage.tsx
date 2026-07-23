import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

/** Layout de lectura para las páginas legales: una columna angosta y aireada. */
export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <>
      <SiteNav />
      <main style={{ background: "#F4EFE7", minHeight: "100vh", paddingBottom: 110 }}>
        <div style={{ height: 96 }} />
        <article style={{ maxWidth: 680, margin: "0 auto", padding: "44px 24px 0" }}>
          <h1
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 400,
              fontSize: "clamp(30px,4vw,46px)",
              margin: 0,
              color: "#1D1D1D",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 12.5, color: "#8a8170", margin: "12px 0 0", letterSpacing: ".04em" }}>
            {updatedAt}
          </p>
          <p style={{ fontSize: 16, color: "#4a463f", lineHeight: 1.8, margin: "28px 0 0" }}>
            {intro}
          </p>

          {sections.map((s) => (
            <section key={s.heading} style={{ marginTop: 36 }}>
              <h2
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontWeight: 500,
                  fontSize: 22,
                  margin: "0 0 10px",
                  color: "#1D1D1D",
                }}
              >
                {s.heading}
              </h2>
              <p style={{ fontSize: 15, color: "#4a463f", lineHeight: 1.8, margin: 0 }}>
                {s.body}
              </p>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
