"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Custom active matcher */
  isActive?: (pathname: string) => boolean;
};

function isItemActive(item: PortalNavItem, pathname: string) {
  if (item.isActive) return item.isActive(pathname);
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PortalShell({
  brandHref,
  name,
  roleLabel,
  nav,
  footerNav,
  children,
}: {
  brandHref: string;
  name: string;
  roleLabel: string;
  nav: PortalNavItem[];
  footerNav?: PortalNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {nav.map((item) => {
            const active = isItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#E8E4F0] text-slate-900"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-200 p-3">
          {footerNav?.map((item) => {
            const active = isItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#E8E4F0] text-slate-900"
                    : "text-slate-600 hover:bg-slate-200/60"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold text-slate-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F7F7F8]">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-[#F3F3F5] md:flex">
        <div className="px-3 py-4">
          <BrandLogo href={brandHref} size="sm" />
        </div>
        <NavLinks />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-[#F3F3F5] shadow-xl">
            <div className="flex items-center justify-between px-3 py-3">
              <BrandLogo href={brandHref} size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo href={brandHref} size="sm" />
        </header>
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
