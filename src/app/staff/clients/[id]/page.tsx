import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { StatusPill } from "@/components/status-pill";
import { statusLabel } from "@/lib/orders";
import { ProductImage } from "@/components/product-image";
import { Package, FileText, Users } from "lucide-react";

export default async function StaffClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: "CLIENT" },
        orderBy: { name: "asc" },
      },
      assets: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      orders: {
        include: {
          assignee: { select: { name: true } },
          product: {
            select: { localImage: true, imageUrl: true, name: true },
          },
          proofReviews: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { status: true },
          },
          _count: { select: { files: true, proposals: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!company) notFound();

  const byStatus = company.orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-auto p-6">
      <Link href="/staff/clients" className="text-sm text-orange-600 hover:underline">
        ← Clients
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Client company · {company.orders.length} order
            {company.orders.length === 1 ? "" : "s"} · {company.users.length} contact
            {company.users.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/staff/orders/new?companyId=${company.id}`}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          New order for client
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(byStatus).length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
            No orders yet
          </div>
        ) : (
          Object.entries(byStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-xs text-slate-500">{statusLabel(status)}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{count}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Package className="h-4 w-4" />
            Orders
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {company.orders.length === 0 && (
              <p className="py-6 text-sm text-slate-400">No orders for this client</p>
            )}
            {company.orders.map((o) => (
              <Link
                key={o.id}
                href={`/staff/orders/${o.id}`}
                className="flex gap-3 py-3 hover:bg-slate-50"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                  <ProductImage
                    src={o.product?.localImage || o.product?.imageUrl}
                    className="h-full w-full object-contain p-1"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{o.number}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="truncate text-sm text-slate-700">{o.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Qty {o.quantity}
                    {o.assignee ? ` · ${o.assignee.name}` : ""}
                    {` · ${o._count.proposals} proposal${o._count.proposals === 1 ? "" : "s"}`}
                    {` · ${o._count.files} file${o._count.files === 1 ? "" : "s"}`}
                    {` · Updated ${format(o.updatedAt, "MMM d, yyyy")}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4" />
              Contacts
            </h2>
            <ul className="mt-3 space-y-3">
              {company.users.length === 0 && (
                <li className="text-sm text-slate-400">No portal users</li>
              )}
              {company.users.map((u) => (
                <li key={u.id} className="text-sm">
                  <p className="font-medium text-slate-900">
                    {u.name}
                    {!u.active && (
                      <span className="ml-2 text-[10px] uppercase text-red-500">Inactive</span>
                    )}
                  </p>
                  <p className="text-slate-500">{u.email}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4" />
              Brand files
            </h2>
            <ul className="mt-3 space-y-2">
              {company.assets.length === 0 && (
                <li className="text-sm text-slate-400">No logos or brand files uploaded</li>
              )}
              {company.assets.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/company/files/${a.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="min-w-0 truncate font-medium text-slate-800">
                      {a.originalName}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase text-slate-400">
                      {a.kind}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
