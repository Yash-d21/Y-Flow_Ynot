"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LazyChatBubble } from "@/components/chat/lazy-chat-bubble";
import { DEMO_CLIENT, DEMO_STAFF } from "@/lib/demo-accounts";

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
      aria-hidden
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [demoLoading, setDemoLoading] = useState<"client" | "staff" | null>(null);

  function resolveDest(role: "CLIENT" | "STAFF") {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("yflow-post-login");
      sessionStorage.removeItem("yflow-post-login");
    } catch {
      /* ignore */
    }
    const preferred = callbackUrl || stored;
    if (role === "CLIENT") {
      if (preferred?.startsWith("/client")) return preferred;
      return "/client";
    }
    if (preferred?.startsWith("/staff")) return preferred;
    return "/staff";
  }

  async function completeSignIn(roleHint?: "CLIENT" | "STAFF") {
    router.refresh();
    // Role comes from session after refresh; use hint from demo buttons when known
    if (roleHint === "CLIENT") {
      router.push(resolveDest("CLIENT"));
      return;
    }
    if (roleHint === "STAFF") {
      router.push(resolveDest("STAFF"));
      return;
    }
    router.push("/");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    const isClient = email.toLowerCase().includes("client");
    await completeSignIn(isClient ? "CLIENT" : "STAFF");
  }

  async function demoLogin(which: "client" | "staff") {
    setError("");
    setDemoLoading(which);
    const creds = which === "client" ? DEMO_CLIENT : DEMO_STAFF;
    // Do not fill the password field — keeps the secret out of the UI
    setEmail(creds.email);
    setPassword("");
    const res = await signIn("credentials", {
      email: creds.email,
      password: creds.password,
      redirect: false,
    });
    if (res?.error) {
      setDemoLoading(null);
      setError("Demo login failed. Is the seed data loaded?");
      return;
    }
    await completeSignIn(which === "client" ? "CLIENT" : "STAFF");
  }

  async function sendMagic() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/magic-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not send magic link");
      return;
    }
    setMagicSent(true);
  }

  useEffect(() => {
    // If chat stored a destination and user lands with callbackUrl, keep both in sync
    if (callbackUrl?.startsWith("/client")) {
      try {
        sessionStorage.setItem("yflow-post-login", callbackUrl);
      } catch {
        /* ignore */
      }
    }
  }, [callbackUrl]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <BrandLogo size="lg" priority />
          <p className="mt-2 text-sm text-slate-500">Staff & client portal</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading || !!demoLoading}
            onClick={() => void demoLogin("client")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-800 hover:bg-orange-100 disabled:cursor-wait disabled:opacity-70"
          >
            {demoLoading === "client" ? (
              <>
                <Spinner />
                Signing in…
              </>
            ) : (
              "Test Client"
            )}
          </button>
          <button
            type="button"
            disabled={loading || !!demoLoading}
            onClick={() => void demoLogin("staff")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70"
          >
            {demoLoading === "staff" ? (
              <>
                <Spinner />
                Signing in…
              </>
            ) : (
              "Test Staff"
            )}
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {magicSent && (
            <p className="text-sm text-emerald-600">
              Magic link sent. Check your email (or server console if SMTP is unset).
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !!demoLoading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void sendMagic()}
          disabled={loading || !!demoLoading || !email}
          className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Email me a magic link
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          New client?{" "}
          <Link href="/signup" className="font-medium text-orange-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <LazyChatBubble
        mode="login"
        userName="Guest"
        userEmail=""
        companyName=""
      />
    </div>
  );
}
