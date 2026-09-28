import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ClientsPage() {
  const companies = await prisma.company.findMany({
    include: {
      users: {
        where: { role: "CLIENT" },
        select: { id: true, name: true, email: true, active: true },
      },
      orders: {
        select: { status: true },
      },
      _count: { select: { orders: true, assets: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 overflow-auto bg-white p-6">
      <h1 className="text-xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-slate-500">
        Companies, contacts, and their orders. Click a row for full detail.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Active stages</th>
              <th className="px-4 py-3">Files</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No client companies yet
                </td>
              </tr>
            )}
            {companies.map((c) => {
              const statusCounts = c.orders.reduce<Record<string, number>>((acc, o) => {
                acc[o.status] = (acc[o.status] || 0) + 1;
                return acc;
              }, {});
              const stageSummary = Object.entries(statusCounts)
                .slice(0, 4)
                .map(([s, n]) => `${s} (${n})`)
                .join(" · ");

              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/staff/clients/${c.id}`}
                      className="font-medium text-slate-900 hover:text-orange-600"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.users.length === 0
                      ? "—"
                      : c.users.map((u) => (
                          <div key={u.id} className="truncate">
                            {u.name}{" "}
                            <span className="text-slate-400">&lt;{u.email}&gt;</span>
                          </div>
                        ))}
                  </td>
                  <td className="px-4 py-3 font-medium">{c._count.orders}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {stageSummary || "—"}
                  </td>
                  <td className="px-4 py-3">{c._count.assets}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
