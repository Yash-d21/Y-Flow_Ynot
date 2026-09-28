"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Package, Loader2 } from "lucide-react";
import { ProductImage } from "@/components/product-image";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  priceLabel: string;
  priceUsd: number;
  image: string | null;
  imageUrl?: string | null;
  localImage?: string | null;
};

export default function ClientNewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading catalog…
        </div>
      }
    >
      <ClientNewOrderInner />
    </Suspense>
  );
}

function ClientNewOrderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    quantity: 100,
    deadline: "",
    brandingNotes: "",
    complianceNotes: "",
    title: "",
    productDescription: "",
    budget: "",
  });

  const load = useCallback(async () => {
    setLoadingList(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "24",
    });
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setCategories(data.categories || []);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    setLoadingList(false);
  }, [page, q, category]);

  useEffect(() => {
    void load();
  }, [load]);

  // Prefill from chatbot product card link
  useEffect(() => {
    if (!productIdParam) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/products?id=${encodeURIComponent(productIdParam)}`);
      if (!res.ok) return;
      const data = await res.json();
      const match =
        (data.products as Product[] | undefined)?.find((p) => p.id === productIdParam) ||
        (data.product as Product | undefined);
      if (!cancelled && match) {
        setMode("catalog");
        setSelected(match);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productIdParam]);

  // Also select if the product appears in the current page list
  useEffect(() => {
    if (!productIdParam || selected?.id === productIdParam) return;
    const found = products.find((p) => p.id === productIdParam);
    if (found) setSelected(found);
  }, [productIdParam, products, selected?.id]);

  async function submitCatalog(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Pick a product from the catalog");
      return;
    }
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selected.id,
        quantity: Number(form.quantity),
        deadline: form.deadline || undefined,
        brandingNotes: form.brandingNotes || undefined,
        complianceNotes: form.complianceNotes || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.push(`/client/orders/${data.id}`);
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        custom: true,
        title: form.title,
        productDescription: form.productDescription,
        quantity: Number(form.quantity),
        budget: form.budget || undefined,
        deadline: form.deadline || undefined,
        brandingNotes: form.brandingNotes || undefined,
        complianceNotes: form.complianceNotes || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.push(`/client/orders/${data.id}`);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/client" className="text-sm text-orange-600 hover:underline">
          ← Orders
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Create order</h1>
            <p className="text-sm text-slate-500">
              Choose from the Y-Not in-stock catalog, or submit a fully custom brief.
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-200 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setMode("catalog")}
              className={`rounded-md px-3 py-1.5 font-medium ${
                mode === "catalog" ? "bg-orange-500 text-white" : "text-slate-600"
              }`}
            >
              Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("custom");
                setSelected(null);
              }}
              className={`rounded-md px-3 py-1.5 font-medium ${
                mode === "custom" ? "bg-orange-500 text-white" : "text-slate-600"
              }`}
            >
              Custom brief
            </button>
          </div>
        </div>
      </header>

      {mode === "catalog" ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-6 py-3">
              <div className="relative min-w-[200px] flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Search products…"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-300 focus:bg-white"
                />
              </div>
              <select
                value={category}
                onChange={(e) => {
                  setPage(1);
                  setCategory(e.target.value);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">{total} products</span>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadingList ? (
                <p className="p-6 text-sm text-slate-400">Loading catalog…</p>
              ) : products.length === 0 ? (
                <p className="p-6 text-sm text-slate-400">No products match. Try another search.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => {
                    const active = selected?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelected(p)}
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          active
                            ? "border-orange-500 ring-2 ring-orange-200"
                            : "border-slate-200 hover:border-slate-300"
                        } bg-white`}
                      >
                        <div className="relative flex h-36 items-center justify-center bg-slate-50">
                          {p.image || p.localImage || p.imageUrl ? (
                            <ProductImage
                              src={p.image || p.localImage}
                              fallbackSrc={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <Package className="h-10 w-10 text-slate-300" />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-2 text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{p.category}</p>
                          <p className="mt-1 text-sm font-semibold text-orange-600">{p.priceLabel}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          <aside className="flex w-[320px] shrink-0 flex-col border-l border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Order details</h2>
            </div>
            <form onSubmit={submitCatalog} className="flex flex-1 flex-col gap-3 overflow-auto p-4">
              {selected ? (
                <div className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-2 flex h-28 items-center justify-center overflow-hidden rounded-md bg-slate-50">
                    <ProductImage
                      src={selected.image || selected.localImage}
                      fallbackSrc={selected.imageUrl}
                      alt={selected.name}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                  <p className="text-sm font-medium">{selected.name}</p>
                  <p className="text-xs text-slate-500">{selected.category}</p>
                  <p className="mt-1 font-semibold text-orange-600">{selected.priceLabel} / unit</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Select a product on the left</p>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500">Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Deadline</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Branding / imprint notes</label>
                <textarea
                  value={form.brandingNotes}
                  onChange={(e) => setForm({ ...form, brandingNotes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Logo placement, colors, personalization…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Compliance</label>
                <textarea
                  value={form.complianceNotes}
                  onChange={(e) => setForm({ ...form, complianceNotes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Optional"
                />
              </div>
              {selected && (
                <p className="text-xs text-slate-500">
                  Est. catalog subtotal:{" "}
                  <strong>
                    ${(selected.priceUsd * Number(form.quantity || 0)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>{" "}
                  (before decoration / shipping — staff will confirm)
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !selected}
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting…" : "Place order request"}
              </button>
            </form>
          </aside>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <form
            onSubmit={submitCustom}
            className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
          >
            <p className="text-sm text-slate-500">
              For fully custom products not in the catalog. Staff will send proposals.
            </p>
            <div>
              <label className="text-sm font-medium">Project title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Brief</label>
              <textarea
                required
                value={form.productDescription}
                onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
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
            <div>
              <label className="text-sm font-medium">Branding notes</label>
              <textarea
                value={form.brandingNotes}
                onChange={(e) => setForm({ ...form, brandingNotes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting…" : "Submit custom brief"}
              </button>
          </form>
        </div>
      )}
    </div>
  );
}
