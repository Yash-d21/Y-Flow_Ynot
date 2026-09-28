"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

type Company = { id: string; name: string };

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading…</div>}>
      <NewOrderInner />
    </Suspense>
  );
}

function NewOrderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCompany = searchParams.get("companyId") || "";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    companyId: preselectedCompany,
    title: "",
    productDescription: "",
    quantity: 100,
    budget: "",
    deadline: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/companies")
      .then((r) => r.json())
      .then((data: Company[]) => {
        setCompanies(data);
        if (preselectedCompany) {
          setForm((f) => ({ ...f, companyId: preselectedCompany }));
        }
      });
  }, [preselectedCompany]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          deadline: form.deadline || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.push(`/staff/orders/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <Link href="/staff" className="text-sm text-orange-600 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">New order</h1>
      <form onSubmit={submit} className="mt-6 max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="text-sm font-medium">Client company</label>
          <select
            required
            value={form.companyId}
            onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Product title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            required
            value={form.productDescription}
            onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Budget</label>
          <input
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create order"}
        </button>
      </form>
    </div>
  );
}
