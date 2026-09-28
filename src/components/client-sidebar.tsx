"use client";

import { Package, CheckSquare, FolderOpen, HelpCircle, ShoppingBag } from "lucide-react";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell";

const nav: PortalNavItem[] = [
  { href: "/client", label: "Orders", icon: Package, exact: true },
  {
    href: "/client/orders/new",
    label: "Catalog",
    icon: ShoppingBag,
    isActive: (p) => p.startsWith("/client/orders/new"),
  },
  { href: "/client/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/client/files", label: "Files", icon: FolderOpen },
];

const footerNav: PortalNavItem[] = [
  { href: "/client/help", label: "Help", icon: HelpCircle },
];

export function ClientSidebar({
  name,
  companyName,
  children,
}: {
  name: string;
  companyName: string;
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      brandHref="/client"
      name={name}
      roleLabel={`Client · ${companyName}`}
      nav={nav}
      footerNav={footerNav}
    >
      {children}
    </PortalShell>
  );
}
