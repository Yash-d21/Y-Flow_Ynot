import { STATUS_LABELS, STATUS_PILL } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export function StatusPill({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[s] || "bg-slate-100 text-slate-700"}`}
    >
      {STATUS_LABELS[s] || status}
    </span>
  );
}
