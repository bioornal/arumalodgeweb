export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[12px] uppercase tracking-[0.26em] text-bronce ${className}`}>
      {children}
    </span>
  );
}
