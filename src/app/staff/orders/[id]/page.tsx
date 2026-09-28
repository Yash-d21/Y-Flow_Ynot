"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { StatusPill } from "@/components/status-pill";
import { StatusStepper } from "@/components/status-stepper";
import { LoadingButton } from "@/components/loading-button";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";
import Link from "next/link";

type Proposal = {
  id: string;
  title: string;
  details: string;
  price: string | null;
  leadTime: string | null;
  status: string;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  number: string;
  title: string;
  productDescription: string;
  quantity: number;
  budget: string | null;
  deadline: string | null;
  status: string;
  company: { name: string };
  product?: {
    name: string;
    priceLabel: string;
    category: string;
    localImage: string | null;
    imageUrl: string | null;
  } | null;
  unitPriceLabel?: string | null;
  brandingNotes?: string | null;
  files: { id: string; originalName: string; kind: string; sizeBytes: number | null }[];
  events: { id: string; message: string; createdAt: string; actor?: { name: string } | null }[];
  proofReviews: { status: string; clientNote: string | null }[];
  proposals: Proposal[];
};

const PROPOSAL_STAGES = new Set(["LEAD", "BRIEF", "QUOTE"]);

export default function StaffOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposal, setProposal] = useState({
    title: "",
    details: "",
    price: "",
    leadTime: "",
  });
  const [propMsg, setPropMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/orders/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setOrder(data);
    setStatus(data.status);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveStatus() {
    if (savingStatus) return;
    setSavingStatus(true);
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, notifyClient: true }),
      });
      setNote("");
      await load();
    } finally {
      setSavingStatus(false);
    }
  }

  async function sendProposal(e: React.FormEvent) {
    e.preventDefault();
    if (sendingProposal) return;
    setPropMsg("");
    setSendingProposal(true);
    try {
      const res = await fetch(`/api/orders/${id}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      });
      if (!res.ok) {
        const data = await res.json();
        setPropMsg(data.error || "Failed");
        return;
      }
      setProposal({ title: "", details: "", price: "", leadTime: "" });
      setPropMsg("Proposal sent to client");
      await load();
    } finally {
      setSendingProposal(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>, kind: string) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      await fetch(`/api/orders/${id}/files`, { method: "POST", body: fd });
      await load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!order) {
    return <div className="p-6 text-slate-500">Loading…</div>;
  }

  const canSendProposal = PROPOSAL_STAGES.has(order.status);

  return (
    <div className="flex-1 overflow-auto p-6">
      <Link href="/staff" className="text-sm text-orange-600 hover:underline">
        ← Orders
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.number}</h1>
            <StatusPill status={order.status} />
          </div>
          <p className="mt-1 text-slate-700">{order.title}</p>
          <p className="text-sm text-slate-500">
            {order.company.name} · Qty {order.quantity}
            {order.deadline ? ` · Due ${format(new Date(order.deadline), "MMM d, yyyy")}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Client brief</h2>
            {order.product && (
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-white">
                  {(order.product.localImage || order.product.imageUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.product.localImage || order.product.imageUrl || ""}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Catalog · {order.product.category}</p>
                  <p className="text-sm font-medium">{order.product.name}</p>
                  <p className="text-sm text-orange-600">
                    {order.unitPriceLabel || order.product.priceLabel}
                  </p>
                </div>
              </div>
            )}
            <p className="mt-2 text-sm text-slate-600">{order.productDescription}</p>
            {order.budget && (
              <p className="mt-2 text-sm text-slate-500">Budget: {order.budget}</p>
            )}
            {order.brandingNotes && (
              <p className="mt-2 text-sm text-slate-500">Branding: {order.brandingNotes}</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Proposals</h2>
            <div className="mt-3 space-y-3">
              {(!order.proposals || order.proposals.length === 0) && (
                <p className="text-sm text-slate-400">No proposals yet</p>
              )}
              {order.proposals?.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{p.title}</p>
                    <span className="text-[10px] uppercase text-slate-500">{p.status}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">{p.details}</p>
                  <p className="mt-1 text-slate-500">
                    {[p.price, p.leadTime].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>

            {canSendProposal ? (
              <form onSubmit={sendProposal} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Send new proposal
                </p>
                <input
                  required
                  placeholder="Proposal title"
                  value={proposal.title}
                  onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                  disabled={sendingProposal}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                />
                <textarea
                  required
                  placeholder="Details / scope"
                  value={proposal.details}
                  onChange={(e) => setProposal({ ...proposal, details: e.target.value })}
                  disabled={sendingProposal}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Price"
                    value={proposal.price}
                    onChange={(e) => setProposal({ ...proposal, price: e.target.value })}
                    disabled={sendingProposal}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                  />
                  <input
                    placeholder="Lead time"
                    value={proposal.leadTime}
                    onChange={(e) => setProposal({ ...proposal, leadTime: e.target.value })}
                    disabled={sendingProposal}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                  />
                </div>
                {propMsg && (
                  <p
                    className={`text-sm ${
                      propMsg.toLowerCase().includes("fail") ||
                      propMsg.toLowerCase().includes("can't")
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {propMsg}
                  </p>
                )}
                <LoadingButton
                  type="submit"
                  loading={sendingProposal}
                  loadingText="Sending…"
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Send proposal to client
                </LoadingButton>
              </form>
            ) : (
              <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                Proposal sending is closed for this stage. Past proposals stay listed above.
                To re-quote, move the order back to Brief or Proposal.
              </p>
            )}
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
            <div className="mt-4 flex flex-wrap gap-3">
              <label
                className={`rounded-lg border border-slate-200 px-3 py-2 text-sm ${
                  uploading ? "cursor-wait opacity-60" : "cursor-pointer"
                }`}
              >
                {uploading ? "Uploading…" : "Upload proof"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void onUpload(e, "PROOF")}
                />
              </label>
              <label
                className={`rounded-lg border border-slate-200 px-3 py-2 text-sm ${
                  uploading ? "cursor-wait opacity-60" : "cursor-pointer"
                }`}
              >
                {uploading ? "Uploading…" : "Upload other"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void onUpload(e, "OTHER")}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold">Activity</h2>
            <ul className="mt-3 space-y-3">
              {order.events.map((ev) => (
                <li key={ev.id} className="text-sm">
                  <p className="text-slate-800">{ev.message}</p>
                  <p className="text-xs text-slate-400">
                    {ev.actor?.name || "System"} ·{" "}
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
            <label className="mt-4 block text-xs font-medium text-slate-500">Move to</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={savingStatus}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s as OrderStatus]}
                </option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              disabled={savingStatus}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
              rows={2}
            />
            <LoadingButton
              type="button"
              loading={savingStatus}
              loadingText="Updating…"
              onClick={() => void saveStatus()}
              className="mt-3 w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Update status
            </LoadingButton>
          </section>

          {order.proofReviews[0] && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
              <h2 className="font-semibold">Latest proof review</h2>
              <p className="mt-1 text-slate-600">Status: {order.proofReviews[0].status}</p>
              {order.proofReviews[0].clientNote && (
                <p className="mt-1 text-slate-500">Note: {order.proofReviews[0].clientNote}</p>
              )}
            </section>
          )}

          <button
            type="button"
            onClick={() => router.push("/staff")}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
