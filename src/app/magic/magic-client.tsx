"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MagicClientPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      if (!token) {
        setError("Missing token");
        return;
      }
      const meta = await fetch(`/api/auth/magic-meta?token=${encodeURIComponent(token)}`);
      const data = await meta.json();
      if (!meta.ok) {
        setError(data.error || "Invalid link");
        return;
      }
      const res = await signIn("credentials", {
        magicToken: token,
        redirect: false,
      });
      if (res?.error) {
        setError("Could not sign in with this link");
        return;
      }
      router.replace(data.redirectTo || "/client");
    }
    void run();
  }, [token, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-600">
        <p>{error}</p>
        <a href="/login" className="text-orange-600 underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-600">
      Signing you in…
    </div>
  );
}
