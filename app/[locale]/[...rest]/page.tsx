import { notFound } from "next/navigation";

// Cualquier ruta inexistente bajo un locale (/es/lo-que-sea) cae acá y dispara
// el boundary not-found del segmento, que renderiza app/[locale]/not-found.tsx
// con la identidad del sitio. Sin este catch-all, next-intl deja pasar la 404
// cruda de Next para rutas profundas que no matchean.
export default function CatchAllNotFound() {
  notFound();
}
