"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Package,
  ClipboardList,
  Stamp,
  Factory,
  Truck,
  Users,
  Inbox,
  LogOut,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const nav = [
  { href: "/staff", label: "Orders", icon: Package, exact: true },
  { href: "/staff/briefs", label: "Briefs", icon: ClipboardList },
  { href: "/staff/proofs", label: "Proofs", icon: Stamp },
  { href: "/staff/production", label: "Production", icon: Factory },
  { href: "/staff/shipments", label: "Shipments", icon: Truck },
  { href: "/staff/clients", label: "Clients", icon: Users },
  { href: "/staff/inbox", label: "Inbox", icon: Inbox },
];

export function StaffSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const onOrders = pathname === "/staff" || pathname.startsWith("/staff/orders");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-[#F3F3F5]">
      <div className="px-3 py-4">
        <BrandLogo href="/staff" size="sm" />
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map((item) => {
          const active = item.exact
            ? onOrders
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[#E8E4F0] text-slate-900"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold text-slate-700">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">Staff</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
