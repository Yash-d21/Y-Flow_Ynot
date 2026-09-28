import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  /** compact = icon-ish height for sidebars; large = login/signup */
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
};

const HEIGHTS = { sm: 28, md: 36, lg: 48 } as const;

export function BrandLogo({
  href,
  size = "sm",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const h = HEIGHTS[size];
  // Full wordmark aspect ~229:83
  const w = Math.round(h * (229.39 / 82.87));

  const img = (
    <Image
      src="/y-not-logo.svg"
      alt="Y Not Manufacturing"
      width={w}
      height={h}
      priority={priority}
      className={`h-auto w-auto max-w-full object-contain object-left ${className}`}
      style={{ height: h, width: "auto" }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center" aria-label="Y Not Manufacturing">
        {img}
      </Link>
    );
  }

  return img;
}
