"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageCircle, X, Send, UserRound } from "lucide-react";
import { parseChatContent, type ChatProduct } from "@/lib/chat-content";
import { ProductImage } from "@/components/product-image";
import { getInitialChatOpen, setChatOpenPreference } from "@/components/chat/chat-open-state";

function stripDashes(text: string) {
  return text.replace(/\u2014|\u2013/g, " - ").replace(/ {2,}/g, " ");
}

type Msg = {
  id?: string;
  role: string;
  content: string;
  products?: ChatProduct[];
};

function MessageBody({
  content,
  products,
  isUser,
  portalGate,
}: {
  content: string;
  products?: ChatProduct[];
  isUser?: boolean;
  /** When set, product/catalog clicks go through this instead of normal links */
  portalGate?: (path: string) => void;
}) {
  const parsed = parseChatContent(content);
  const text = stripDashes(parsed.text);
  const cards = products?.length ? products : parsed.products;

  function productHref(id: string) {
    return `/client/orders/new?productId=${encodeURIComponent(id)}`;
  }

  return (
    <div className={isUser ? "text-white" : "text-slate-800"}>
      <div
        className={`chat-md text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
          isUser
            ? "[&_strong]:font-semibold [&_a]:text-white [&_a]:underline"
            : "[&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_a]:text-orange-600"
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>

      {cards.length > 0 && !isUser && (
        <div className="mt-2 space-y-2">
          {cards.map((p) =>
            portalGate ? (
              <button
                key={p.id}
                type="button"
                onClick={() => portalGate(productHref(p.id))}
                className="flex w-full gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-orange-300 hover:bg-orange-50"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  <ProductImage
                    src={p.image}
                    fallbackSrc={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-500">
                    ID #{p.externalId} · {p.category}
                  </p>
                  <p className="text-xs font-semibold text-orange-600">{p.priceLabel}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-orange-600">
                    Continue in client portal →
                  </p>
                </div>
              </button>
            ) : (
              <Link
                key={p.id}
                href={productHref(p.id)}
                className="flex gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 transition hover:border-orange-300 hover:bg-orange-50"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  <ProductImage
                    src={p.image}
                    fallbackSrc={p.imageUrl}
                    alt={p.name}
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-500">
                    ID #{p.externalId} · {p.category}
                  </p>
                  <p className="text-xs font-semibold text-orange-600">{p.priceLabel}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-orange-600">Tap to order →</p>
                </div>
              </Link>
            )
          )}
          {portalGate ? (
            <button
              type="button"
              onClick={() => portalGate("/client/orders/new")}
              className="block w-full rounded-lg bg-orange-500 py-1.5 text-center text-xs font-semibold text-white hover:bg-orange-600"
            >
              Browse full catalog
            </button>
          ) : (
            <Link
              href="/client/orders/new"
              className="block rounded-lg bg-orange-500 py-1.5 text-center text-xs font-semibold text-white hover:bg-orange-600"
            >
              Browse full catalog
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatBubble({
  userName,
  userEmail,
  companyName,
  mode = "portal",
}: {
  userName: string;
  userEmail: string;
  companyName: string;
  /** login = guest preview on login page; clicks go to client portal */
  mode?: "portal" | "login";
}) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [open, setOpen] = useState(() => (isLogin ? true : getInitialChatOpen()));
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: isLogin
        ? "Hi! I'm the **Y-Flow** assistant. Ask about tumblers, apparel, bags, and more. Tap any product or action to continue in the **client portal** (use **Test Client** to sign in quickly)."
        : "Hi! I'm the **Y-Flow** assistant. Ask for drinkware, apparel, bags, and more. I'll show matching catalog products with prices. Tap a product to order, or **Hand to human** for the team.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function goClientPortal(path = "/client") {
    // Persist intended destination for after Test Client / sign-in
    try {
      sessionStorage.setItem("yflow-post-login", path);
    } catch {
      /* ignore */
    }
    router.push(path);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (isLogin || !handedOff || !sessionId || !open) return;
    const tick = async () => {
      const res = await fetch(`/api/chat/session?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length) {
        setMessages(
          data.messages.map((m: Msg) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
    };
    void tick();
    const t = setInterval(() => void tick(), 4000);
    return () => clearInterval(t);
  }, [handedOff, sessionId, open, isLogin]);

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetch("/api/chat/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply || "Sorry, something went wrong.",
            products: data.products || [],
          },
        ]);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId,
            visitorName: userName,
            visitorEmail: userEmail,
            companyName,
          }),
        });
        const data = await res.json();
        if (data.sessionId) setSessionId(data.sessionId);

        if (data.humanMode) {
          if (data.message) {
            setMessages((m) => [...m, { role: "assistant", content: data.message }]);
          }
        } else {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content: data.reply || "Sorry, something went wrong.",
              products: data.products || [],
            },
          ]);
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handoff() {
    if (isLogin) {
      goClientPortal("/client");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          visitorName: userName,
          visitorEmail: userEmail,
          companyName,
          summary: messages
            .slice(-6)
            .map((m) => `${m.role}: ${parseChatContent(m.content).text}`)
            .join("\n"),
        }),
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      setHandedOff(true);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Connected to staff. Keep typing here; they'll reply in this chat.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-x-3 bottom-[5.5rem] top-auto z-50 flex h-[min(560px,calc(100dvh-7.5rem))] w-auto flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:bottom-20 sm:right-5 sm:h-[560px] sm:w-[380px] sm:max-h-[min(560px,70vh)]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/y-not-logo.svg"
                alt="Y Not Manufacturing"
                className="h-7 w-auto max-w-[180px] object-contain object-left"
              />
              <p className="mt-0.5 text-[11px] text-slate-500">
                {isLogin
                  ? "Preview · continues in client portal"
                  : handedOff
                    ? "Chat with staff"
                    : "Y-Flow assistant · product help"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (!isLogin) setChatOpenPreference(false);
              }}
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Minimize chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.map((m, i) => (
              <div
                key={m.id || i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 ${
                    m.role === "user"
                      ? "bg-orange-500 text-white"
                      : m.role === "staff"
                        ? "border border-orange-200 bg-orange-50"
                        : "border border-slate-200 bg-white"
                  }`}
                >
                  {m.role === "staff" && (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase text-orange-600">
                      Staff
                    </p>
                  )}
                  <MessageBody
                    content={m.content}
                    products={m.products}
                    isUser={m.role === "user"}
                    portalGate={isLogin ? goClientPortal : undefined}
                  />
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-slate-400">Finding products…</p>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 p-3">
            {!handedOff && (
              <button
                type="button"
                onClick={() => void handoff()}
                disabled={loading}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <UserRound className="h-3.5 w-3.5" />
                {isLogin ? "Continue in client portal" : "Hand to human"}
              </button>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
                placeholder={
                  isLogin
                    ? "e.g. tumblers, tees…"
                    : handedOff
                      ? "Message staff…"
                      : "e.g. tumblers, Nike tees, picnic blankets…"
                }
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading}
                className="rounded-lg bg-orange-500 p-2 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (!isLogin) setChatOpenPreference(next);
            return next;
          });
        }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 sm:absolute"
        aria-label={open ? "Minimize chat" : "Open chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
