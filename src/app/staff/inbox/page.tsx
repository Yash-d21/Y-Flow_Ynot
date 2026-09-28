"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { LoadingButton } from "@/components/loading-button";

type Msg = { id?: string; role: string; content: string; createdAt?: string };

type Handoff = {
  id: string;
  status: string;
  summary: string;
  visitorName: string | null;
  visitorEmail: string | null;
  companyName: string | null;
  createdAt: string;
  sessionId?: string;
  session: { id: string; messages: Msg[] };
  order?: { number: string } | null;
  claimedBy?: { name: string } | null;
};

export default function InboxPage() {
  const [items, setItems] = useState<Handoff[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = items.find((h) => h.id === selectedId) || null;

  async function load(keepId?: string | null) {
    setLoading(true);
    const res = await fetch("/api/handoffs");
    const data: Handoff[] = await res.json();
    setItems(data);
    const prefer = keepId ?? selectedId;
    if (prefer && data.some((h) => h.id === prefer)) {
      setSelectedId(prefer);
    } else {
      setSelectedId(data[0]?.id ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(selectedId), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.session.messages.length]);

  async function act(action: "claim" | "close" | "convert") {
    if (!selected || acting) return;
    const id = selected.id;
    setActing(action);
    try {
      await fetch(`/api/handoffs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load(id);
    } finally {
      setActing(null);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/handoffs/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      if (!res.ok) return;
      setReply("");
      await load(selected.id);
    } finally {
      setSending(false);
    }
  }

  const canReply =
    selected && selected.status !== "CLOSED" && selected.status !== "CONVERTED";

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div
        className={`flex w-full flex-col border-r border-slate-200 bg-white md:w-80 ${
          selectedId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-4">
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="text-xs text-slate-500">Chat handoffs from clients</p>
        </div>
        <div className="flex-1 overflow-auto">
          {loading && items.length === 0 && (
            <p className="p-4 text-sm text-slate-400">Loading…</p>
          )}
          {!loading && items.length === 0 && (
            <p className="p-4 text-sm text-slate-400">No handoffs yet</p>
          )}
          {items.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelectedId(h.id)}
              className={`w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                selectedId === h.id ? "bg-orange-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-900">
                  {h.visitorName || "Visitor"}
                </p>
                <span className="text-[10px] uppercase text-slate-400">{h.status}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{h.companyName}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {format(new Date(h.createdAt), "MMM d · HH:mm")}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 flex-col bg-white ${
          selectedId ? "flex" : "hidden md:flex"
        }`}
      >
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            Select a handoff
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg px-2 py-1 text-sm text-orange-600 hover:bg-orange-50 md:hidden"
              >
                ← Inbox
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{selected.visitorName}</h2>
                <p className="truncate text-sm text-slate-500">
                  {selected.visitorEmail} · {selected.companyName}
                  {selected.claimedBy ? ` · Claimed by ${selected.claimedBy.name}` : ""}
                </p>
              </div>
              {selected.status === "OPEN" && (
                <LoadingButton
                  type="button"
                  loading={acting === "claim"}
                  loadingText="Claiming…"
                  disabled={!!acting}
                  onClick={() => void act("claim")}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                >
                  Claim
                </LoadingButton>
              )}
              <LoadingButton
                type="button"
                loading={acting === "convert"}
                loadingText="Converting…"
                disabled={!!acting}
                onClick={() => void act("convert")}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Convert to order
              </LoadingButton>
              <LoadingButton
                type="button"
                loading={acting === "close"}
                loadingText="Closing…"
                disabled={!!acting}
                onClick={() => void act("close")}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
              >
                Close
              </LoadingButton>
            </div>

            <div className="flex-1 space-y-3 overflow-auto p-4 sm:p-6">
              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                {selected.summary}
              </div>
              <h3 className="text-xs font-semibold uppercase text-slate-400">Conversation</h3>
              {selected.session.messages.map((m, i) => (
                <div
                  key={m.id || i}
                  className={`flex ${m.role === "staff" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "staff"
                        ? "bg-orange-500 text-white"
                        : m.role === "assistant"
                          ? "border border-slate-200 bg-white text-slate-700"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] uppercase opacity-70">{m.role}</p>
                    {m.content}
                  </div>
                </div>
              ))}
              {selected.order && (
                <p className="text-sm text-emerald-600">Linked order: {selected.order.number}</p>
              )}
              <div ref={bottomRef} />
            </div>

            {canReply ? (
              <div className="border-t border-slate-100 p-4">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void sendReply()}
                    placeholder={
                      selected.status === "OPEN"
                        ? "Type to claim & reply…"
                        : "Reply to client…"
                    }
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
                  />
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sending || !reply.trim()}
                    className="rounded-lg bg-orange-500 p-2 text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-400">
                This handoff is {selected.status.toLowerCase()} — messaging closed.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
