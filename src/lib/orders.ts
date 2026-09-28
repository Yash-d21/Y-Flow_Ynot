import type { OrderStatus } from "@/lib/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "LEAD",
  "BRIEF",
  "QUOTE",
  "PROOF",
  "PRODUCTION",
  "QC",
  "SHIPPING",
  "DELIVERED",
  "REORDER_READY",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  LEAD: "Lead",
  BRIEF: "Brief",
  QUOTE: "Proposal",
  PROOF: "Proof Approval",
  PRODUCTION: "In Production",
  QC: "QC",
  SHIPPING: "Shipping",
  DELIVERED: "Delivered",
  REORDER_READY: "Reorder Ready",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as OrderStatus] || status;
}

export const STATUS_PILL: Record<OrderStatus, string> = {
  LEAD: "bg-slate-100 text-slate-700",
  BRIEF: "bg-amber-50 text-amber-800",
  QUOTE: "bg-yellow-50 text-yellow-800",
  PROOF: "bg-orange-100 text-orange-700",
  PRODUCTION: "bg-blue-100 text-blue-700",
  QC: "bg-indigo-100 text-indigo-700",
  SHIPPING: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  REORDER_READY: "bg-teal-100 text-teal-700",
};

/** Sidebar filter → statuses */
export const NAV_STATUS_FILTER: Record<string, OrderStatus[] | null> = {
  orders: null,
  // Briefs = intake through proposal (pre-proof)
  briefs: ["LEAD", "BRIEF", "QUOTE"],
  proofs: ["PROOF"],
  production: ["PRODUCTION", "QC"],
  shipments: ["SHIPPING", "DELIVERED", "REORDER_READY"],
};

export const STEPPER_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "BRIEF", label: "Brief" },
  { key: "QUOTE", label: "Proposal" },
  { key: "PROOF", label: "Proof" },
  { key: "PRODUCTION", label: "Production" },
  { key: "SHIPPING", label: "Shipping" },
  { key: "DELIVERED", label: "Delivered" },
];

export function stepIndex(status: OrderStatus): number {
  const map: Partial<Record<OrderStatus, number>> = {
    LEAD: 0,
    BRIEF: 0,
    QUOTE: 1,
    PROOF: 2,
    PRODUCTION: 3,
    QC: 3,
    SHIPPING: 4,
    DELIVERED: 5,
    REORDER_READY: 5,
  };
  return map[status] ?? 0;
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value);
}
