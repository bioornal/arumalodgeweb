"use client";
import { useEffect, useState } from "react";

export function ScrollCue() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none absolute z-[3] hidden md:flex flex-col items-center gap-[9px] transition-opacity duration-500"
      style={{
        bottom: 108,
        left: "50%",
        transform: "translateX(-50%)",
        opacity: hidden ? 0 : 1,
      }}
    >
      <div
        style={{
          width: 1,
          height: 44,
          background:
            "linear-gradient(180deg,rgba(248,245,240,0),rgba(248,245,240,.7))",
          animation: "aruma-cue 2.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}
