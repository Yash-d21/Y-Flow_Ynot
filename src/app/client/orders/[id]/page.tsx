"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { StatusPill } from "@/components/status-pill";
import { StatusStepper } from "@/components/status-stepper";
import { LoadingButton } from "@/components/loading-button";
import { Check, MessageSquare, Loader2 } from "lucide-react";

type Proposal = {
  id: string;
  title: string;
  details: string;
  price: string | null;
  leadTime: string | null;
  status: string;
  clientNote: string | null;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  number: string;
  title: string;
  productDescription: string;
  status: string;
  deadline: string | null;
  quantity?: number;
  unitPriceLabel?: string | null;
  brandingNotes?: string | null;
  files: { id: string; originalName: string; kind: string }[];
  events: { id: string; message: string; createdAt: string; clientVisible: boolean }[];
  proofReviews: { status: string }[];
  proposals: Proposal[];
  product?: {
    name: string;
    priceLabel: string;
    category: string;
    localImage: string | null;
    imageUrl: string | null;
  } | null;
};

export default function ClientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/orders/${id}`);
    if (res.ok) setOrder(await res.json());
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function decideProposal(proposalId: string, action: "ACCEPT" | "REJECT") {
    if (busy) return;
    setBusy(`${action}-${proposalId}`);
    setMsg("");
    try {
      const res = await fetch(`/api/orders/${id}/proposals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action, note }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMsg(data.error || "Failed");
        return;
      }
      setMsg(action === "ACCEPT" ? "Proposal accepted" : "Proposal rejected");
      setNote("");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function proof(action: "APPROVE" | "REQUEST_CHANGES") {
    if (busy) return;
    setBusy(action);
    setMsg("");
    try {
      const res = await fetch(`/api/orders/${id}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMsg(data.error || "Failed");
        return;
      }
      setMsg(action === "APPROVE" ? "Proof approved" : "Change request sent");
      setNote("");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "LOGO");
      await fetch(`/api/orders/${id}/files`, { method: "POST", body: fd });
      await load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!order) return <div className="p-6 text-slate-500">Loading…</div>;

  const pendingProof =
    order.status === "PROOF" && order.proofReviews[0]?.status === "PENDING";
  const pendingProposals = order.proposals?.filter((p) => p.status === "PENDING") || [];
  const showProposalActions =
    pendingProposals.length > 0 && ["LEAD", "BRIEF", "QUOTE"].includes(order.status);

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <Link href="/client" className="text-sm text-orange-600 hover:underline">
        ← Orders
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Order {order.number}</h1>
        <StatusPill status={order.status} />
      </div>
      <p className="mt-1 text-slate-700">{order.title}</p>
      {order.unitPriceLabel && (
        <p className="text-sm font-medium text-orange-600">
          {order.unitPriceLabel}
          {order.quantity ? ` · Qty ${order.quantity}` : ""}
        </p>
      )}
      <p className="text-sm text-slate-500">{order.productDescription}</p>
      {order.brandingNotes && (
        <p className="mt-1 text-sm text-slate-500">Branding: {order.brandingNotes}</p>
      )}

      {order.product && (
        <div className="mt-4 flex max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
            {order.product.localImage || order.product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.product.localImage || order.product.imageUrl || ""}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Catalog product</p>
            <p className="text-sm font-medium">{order.product.name}</p>
            <p className="text-xs text-slate-500">{order.product.category}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Proposals</h2>
            <p className="mt-1 text-xs text-slate-500">
              Staff quotes and options for this order appear here.
            </p>
            <div className="mt-4 space-y-3">
              {(!order.proposals || order.proposals.length === 0) && (
                <p className="text-sm text-slate-400">No proposals yet — staff will reply soon.</p>
              )}
              {order.proposals?.map((p) => {
                const accepting = busy === `ACCEPT-${p.id}`;
                const rejecting = busy === `REJECT-${p.id}`;
                return (
                  <div key={p.id} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{p.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                          {p.details}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {p.price && <span className="mr-3">{p.price}</span>}
                          {p.leadTime && <span>{p.leadTime}</span>}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                        {p.status}
                      </span>
                    </div>
                    {showProposalActions && p.status === "PENDING" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <LoadingButton
                          type="button"
                          loading={accepting}
                          loadingText="Accepting…"
                          disabled={!!busy}
                          onClick={() => void decideProposal(p.id, "ACCEPT")}
                          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </LoadingButton>
                        <LoadingButton
                          type="button"
                          loading={rejecting}
                          loadingText="Rejecting…"
                          disabled={!!busy}
                          onClick={() => void decideProposal(p.id, "REJECT")}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Reject
                        </LoadingButton>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {showProposalActions && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note when accepting/rejecting"
                disabled={!!busy}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                rows={2}
              />
            )}
            {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Files</h2>
            <div className="mt-3 space-y-2">
              {order.files.map((f) => (
                <a
                  key={f.id}
                  href={`/api/files/${f.id}`}
                  className="flex justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <span>
                    {f.originalName}{" "}
                    <span className="text-xs text-slate-400">({f.kind})</span>
                  </span>
                  <span className="text-orange-600">Download</span>
                </a>
              ))}
            </div>
            <label
              className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm ${
                uploading ? "cursor-wait opacity-60" : "cursor-pointer"
              }`}
            >
              {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {uploading ? "Uploading…" : "Upload logo / artwork"}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void uploadLogo(e)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Activity</h2>
            <ul className="mt-3 space-y-3">
              {order.events
                .filter((e) => e.clientVisible !== false)
                .map((ev) => (
                  <li key={ev.id} className="text-sm">
                    <p className="text-slate-800">{ev.message}</p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(ev.createdAt), "MMM d, HH:mm")}
                    </p>
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold">Status</h2>
            <StatusStepper status={order.status} />
          </section>

          {pendingProof && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold">Proof review</h2>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                disabled={!!busy}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                rows={3}
              />
              <div className="mt-3 space-y-2">
                <LoadingButton
                  type="button"
                  loading={busy === "APPROVE"}
                  loadingText="Approving…"
                  disabled={!!busy}
                  onClick={() => void proof("APPROVE")}
                  className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white"
                >
                  <Check className="h-4 w-4" /> Approve Proof
                </LoadingButton>
                <LoadingButton
                  type="button"
                  loading={busy === "REQUEST_CHANGES"}
                  loadingText="Sending…"
                  disabled={!!busy}
                  onClick={() => void proof("REQUEST_CHANGES")}
                  className="w-full rounded-lg border border-orange-300 py-2.5 text-sm font-semibold text-orange-700"
                >
                  <MessageSquare className="h-4 w-4" /> Request Changes
                </LoadingButton>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
