"use client";
import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ImageSlot, bucketSrc } from "@/components/ui/ImageSlot";

export type GalleryItem = { label: string; photo?: string };

export function GalleryLightbox({
  items,
  open,
  index,
  onClose,
  onIndex,
}: {
  items: GalleryItem[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const t = useTranslations("galeria");
  const total = items.length;

  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);
  const prev = useCallback(() => onIndex((index - 1 + total) % total), [index, total, onIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, next, prev]);

  if (!open) return null;
  const item = items[index];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("viewFull")}
        onClick={onClose}
        className="absolute inset-0 cursor-zoom-out"
        style={{ background: "rgba(15,15,15,.92)", backdropFilter: "blur(4px)" }}
      />

      {/* Image */}
      <div className="relative z-[1] flex items-center justify-center max-w-[92vw] max-h-[86vh]">
        {item.photo ? (
          <img
            src={bucketSrc(item.photo)}
            alt={item.label}
            className="max-h-[86vh] max-w-[92vw] w-auto h-auto object-contain rounded-[3px]"
            decoding="async"
          />
        ) : (
          <ImageSlot
            label={item.label}
            priority
            className="h-[60vh] md:h-[80vh] w-[92vw] md:w-auto md:max-w-[1100px] rounded-[3px]"
          />
        )}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-5 right-5 z-[2] flex h-10 w-10 items-center justify-center rounded-full text-marfil text-2xl transition-colors hover:text-terracota"
        style={{ background: "rgba(255,255,255,.08)" }}
      >
        ×
      </button>

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Anterior"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-[2] flex h-12 w-12 items-center justify-center rounded-full text-marfil text-2xl transition-colors hover:text-terracota"
            style={{ background: "rgba(255,255,255,.08)" }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Siguiente"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-[2] flex h-12 w-12 items-center justify-center rounded-full text-marfil text-2xl transition-colors hover:text-terracota"
            style={{ background: "rgba(255,255,255,.08)" }}
          >
            ›
          </button>
        </>
      )}

      {/* Counter */}
      {total > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[2] text-marfil/70 text-[12px] tracking-[.2em]">
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
}
