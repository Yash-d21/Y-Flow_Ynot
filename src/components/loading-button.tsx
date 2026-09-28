"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
