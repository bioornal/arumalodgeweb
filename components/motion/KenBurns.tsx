export function KenBurns({ children, className = "" }:
  { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ animation: "aruma-kb 9s ease-out forwards" }}
    >
      {children}
    </div>
  );
}
