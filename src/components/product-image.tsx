"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";

/** Simple product thumbnail with optional remote fallback. */
export function ProductImage({
  src,
  fallbackSrc,
  alt = "",
  className = "h-full w-full object-contain",
  showPlaceholder = true,
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
  showPlaceholder?: boolean;
}) {
  const candidates = [src, fallbackSrc]
    .map((s) => (s || "").trim().replace(/\\/g, "/"))
    .filter(Boolean)
    .map((s) => (s.startsWith("http") || s.startsWith("data:") || s.startsWith("/") ? s : `/${s}`));

  const unique = [...new Set(candidates)];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src, fallbackSrc]);

  const current = unique[index];

  if (!current || index >= unique.length) {
    if (!showPlaceholder) return null;
    return (
      <div className="flex h-full min-h-[3rem] w-full items-center justify-center text-slate-300">
        <Package className="h-8 w-8" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={current}
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
