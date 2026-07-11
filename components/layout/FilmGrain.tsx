// Sin mix-blend-mode: un blend sobre un fixed de viewport completo obliga a
// re-componer TODA la pantalla en cada frame (KenBurns, Lenis, scrub) y en
// software-compositing clava la CPU al 100% — llegaba a congelar la máquina.
export function FilmGrain() {
  return (
    <div
      aria-hidden
      data-grain
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.05]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
