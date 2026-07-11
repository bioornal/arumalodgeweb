import Link from "next/link";

type Variant = "terracota" | "dark" | "outline";
const base = "inline-flex items-center justify-center gap-2 text-[12.5px] uppercase tracking-[0.1em] px-9 py-4 rounded-[2px] transition-[background,transform,color,border-color] duration-300";
const variants: Record<Variant, string> = {
  terracota: "bg-terracota text-marfil hover:bg-terracota-hover hover:-translate-y-0.5",
  dark: "bg-carbon text-marfil hover:bg-terracota",
  outline: "border border-carbon text-carbon hover:bg-carbon hover:text-arena",
};

export function ButtonLink({ href, variant = "terracota", external = false, className = "", children }:
  { href: string; variant?: Variant; external?: boolean; className?: string; children: React.ReactNode }) {
  const cls = `${base} ${variants[variant]} ${className}`;
  if (external) return <a href={href} target="_blank" rel="noopener" className={cls}>{children}</a>;
  return <Link href={href} className={cls}>{children}</Link>;
}
