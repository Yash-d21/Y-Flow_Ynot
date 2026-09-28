"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

type CompanyAsset = {
  id: string;
  kind: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  uploadedBy?: { name: string } | null;
};

type OrderFileRow = {
  id: string;
  kind: string;
  originalName: string;
  createdAt: string;
  orderNumber: string;
};

function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const KINDS = [
  { value: "LOGO", label: "Logo" },
  { value: "BRAND", label: "Brand guideline" },
  { value: "ARTWORK", label: "Artwork" },
  { value: "OTHER", label: "Other" },
] as const;

export default function ClientFilesPage() {
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [orderFiles, setOrderFiles] = useState<OrderFileRow[]>([]);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("LOGO");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [companyRes, orderRes] = await Promise.all([
        fetch("/api/company/files"),
        fetch("/api/client/order-files"),
      ]);
      const assetsData = await companyRes.json();
      if (!companyRes.ok) throw new Error(assetsData.error || "Failed to load");
      setAssets(assetsData.assets || []);

      if (orderRes.ok) {
        const ofData = await orderRes.json();
        setOrderFiles(ofData.files || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        const res = await fetch("/api/company/files", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to upload ${file.name}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAsset(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/company/files/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Delete failed");
      return;
    }
    setAssets((a) => a.filter((x) => x.id !== id));
  }

  const logos = assets.filter((a) => a.kind === "LOGO");
  const others = assets.filter((a) => a.kind !== "LOGO");

  return (
    <div className="flex-1 overflow-auto bg-white p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-900">Files</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload logos and brand assets for your team. Staff can use them on proofs and production.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">File type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Choose files"}
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={
                kind === "LOGO"
                  ? ".png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.ai,.eps,.psd,image/*"
                  : undefined
              }
              className="hidden"
              onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
            }}
            className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? "border-orange-400 bg-orange-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <Upload className="mb-2 h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-600">
              Drag & drop files here, or use Choose files
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Logos: PNG, JPG, SVG, PDF, AI, EPS · Max 25MB each
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-slate-400">Loading files…</p>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ImageIcon className="h-4 w-4" />
                Logos
              </h2>
              {logos.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No logos uploaded yet</p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {logos.map((a) => (
                    <li
                      key={a.id}
                      className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                        {(a.mimeType || "").startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/company/files/${a.id}`}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <FileText className="h-6 w-6 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {a.originalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(a.sizeBytes)} ·{" "}
                          {format(new Date(a.createdAt), "MMM d, yyyy")}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <a
                            href={`/api/company/files/${a.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                          <button
                            type="button"
                            onClick={() => void removeAsset(a.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FileText className="h-4 w-4" />
                Brand & other files
              </h2>
              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {others.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No brand files yet</p>
                ) : (
                  others.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {a.originalName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {a.kind} · {formatBytes(a.sizeBytes)} ·{" "}
                          {format(new Date(a.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <a
                          href={`/api/company/files/${a.id}`}
                          className="text-xs font-medium text-orange-600 hover:underline"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => void removeAsset(a.id)}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {orderFiles.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold text-slate-800">Order attachments</h2>
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {orderFiles.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/files/${f.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{f.originalName}</p>
                        <p className="text-xs text-slate-500">
                          {f.orderNumber} · {f.kind} ·{" "}
                          {format(new Date(f.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <span className="text-xs text-orange-600">Download</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
