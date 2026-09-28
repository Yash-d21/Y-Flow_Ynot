"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Signup failed");
      return;
    }
    const login = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push("/login");
      return;
    }
    router.push("/client");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <BrandLogo size="lg" priority />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Create client account</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Register to track orders and approve proofs.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {(
            [
              ["name", "Full name", "text"],
              ["email", "Work email", "email"],
              ["companyName", "Company", "text"],
              ["password", "Password (min 6)", "password"],
            ] as const
          ).map(([key, label, type]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              <input
                type={type}
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-orange-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
