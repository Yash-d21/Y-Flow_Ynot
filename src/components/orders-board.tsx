"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Plus, Search, Package } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { StatusStepper } from "@/components/status-stepper";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";

export type OrderRow = {
  id: string;
  number: string;
  title: string;
  productDescription: string;
  status: string;
  deadline: string | null;
  quantity: number;
  company: { id: string; name: string };
  assignee?: { id: string; name: string } | null;
  productImage?: string | null;
  productImageUrl?: string | null;
  files: {
    id: string;
    originalName: string;
    kind: string;
    sizeBytes?: number | null;
    createdAt: string;
  }[];
  proofReviews: { id: string; status: string; clientNote?: string | null }[];
};

export function OrdersBoard({
  orders,
  title = "Active Orders",
  showNew = true,
  mode = "staff",
}: {
  orders: OrderRow[];
  title?: string;
  showNew?: boolean;
  mode?: "staff" | "client";
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (o) =>
        o.number.toLowerCase().includes(query) ||
        o.title.toLowerCase().includes(query) ||
        o.company.name.toLowerCase().includes(query)
    );
  }, [orders, q]);

  const selected = filtered.find((o) => o.id === selectedId) || filtered[0] || null;
  const latestProof = selected?.proofReviews?.[0];
  const previewSrc = selected?.productImage || selected?.productImageUrl || null;

  function orderHref(id: string) {
    return mode === "staff" ? `/staff/orders/${id}` : `/client/orders/${id}`;
  }

  function openOrder(id: string) {
    router.push(orderHref(id));
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <div className="relative ml-auto min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                mode === "staff" ? "Search orders, clients, products..." : "Search my orders..."
              }
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-orange-300 focus:bg-white"
            />
          </div>
          {showNew ? (
            <Link
              href={mode === "staff" ? "/staff/orders/new" : "/client/orders/new"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" /> {mode === "client" ? "Create Order" : "New Order"}
            </Link>
          ) : null}
        </header>

        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Order ID</th>
                {mode === "staff" && <th className="px-4 py-3 font-medium">Client</th>}
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const active = selected?.id === o.id;
                return (
                  <tr
                    key={o.id}
                    onClick={() => openOrder(o.id)}
                    onMouseEnter={() => setSelectedId(o.id)}
                    className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 ${
                      active ? "bg-orange-50/40" : ""
                    }`}
                  >
                    <td className="relative px-6 py-3.5 font-medium text-slate-900">
                      {active && (
                        <span className="absolute bottom-0 left-0 top-0 w-1 bg-orange-500" />
                      )}
                      {o.number}
                    </td>
                    {mode === "staff" && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                            {o.company.name.slice(0, 2).toUpperCase()}
                          </span>
                          {o.company.name}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-slate-700">{o.title}</td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={o.status} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {o.deadline ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {format(new Date(o.deadline), "MMM d")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Order {selected.number}</h2>
              <StatusPill status={selected.status} />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-800">{selected.title}</p>
            <p className="mt-1 line-clamp-3 text-xs text-slate-500">{selected.productDescription}</p>
            <div className="mt-4 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white">
              {previewSrc ? (
                <ProductImage
                  src={selected.productImage}
                  fallbackSrc={selected.productImageUrl}
                  alt={selected.title}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 px-4 text-center text-slate-400">
                  <Package className="h-8 w-8" />
                  <span className="text-xs">Custom brief (no catalog image)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Status
            </h3>
            <StatusStepper status={selected.status} />

            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Uploaded Files
            </h3>
            <div className="space-y-2">
              {selected.files.length === 0 && (
                <p className="text-sm text-slate-400">No files yet</p>
              )}
              {selected.files.map((f) => (
                <a
                  key={f.id}
                  href={`/api/files/${f.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <span className="truncate font-medium text-slate-700">{f.originalName}</span>
                  <span className="text-xs text-slate-400">
                    {f.sizeBytes ? `${(f.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 p-4">
            <Link
              href={orderHref(selected.id)}
              className="block w-full rounded-lg border border-slate-200 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open full details
            </Link>
            {mode === "client" &&
              selected.status === "PROOF" &&
              latestProof?.status === "PENDING" && (
                <Link
                  href={orderHref(selected.id)}
                  className="block w-full rounded-lg bg-orange-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Review proof
                </Link>
              )}
          </div>
        </aside>
      )}
    </div>
  );
}
