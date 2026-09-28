"use client";

import {
  Package,
  ClipboardList,
  Stamp,
  Factory,
  Truck,
  Users,
  Inbox,
} from "lucide-react";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell";

const nav: PortalNavItem[] = [
  {
    href: "/staff",
    label: "Orders",
    icon: Package,
    isActive: (p) => p === "/staff" || p.startsWith("/staff/orders"),
  },
  { href: "/staff/briefs", label: "Briefs", icon: ClipboardList },
  { href: "/staff/proofs", label: "Proofs", icon: Stamp },
  { href: "/staff/production", label: "Production", icon: Factory },
  { href: "/staff/shipments", label: "Shipments", icon: Truck },
  { href: "/staff/clients", label: "Clients", icon: Users },
  { href: "/staff/inbox", label: "Inbox", icon: Inbox },
];

export function StaffSidebar({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell brandHref="/staff" name={name} roleLabel="Staff" nav={nav}>
      {children}
    </PortalShell>
  );
}
