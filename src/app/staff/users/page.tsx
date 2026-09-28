"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  company?: { name: string } | null;
};

type Company = { id: string; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
    companyId: "",
  });
  const [error, setError] = useState("");

  async function load() {
    const [u, c] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
    ]);
    setUsers(u);
    setCompanies(c);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        companyId: form.role === "CLIENT" ? form.companyId : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "STAFF", companyId: "" });
    await load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await load();
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <p className="text-sm text-slate-500">Admin only — create staff and client accounts</p>

      <form
        onSubmit={createUser}
        className="mt-6 grid max-w-3xl gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2"
      >
        <input
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          placeholder="Temp password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="CLIENT">Client</option>
        </select>
        {form.role === "CLIENT" && (
          <select
            required
            value={form.companyId}
            onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          >
            <option value="">Select company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white md:col-span-2"
        >
          Create user
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.company?.name || "—"}</td>
                <td className="px-4 py-3">{u.active ? "Active" : "Disabled"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggle(u.id, u.active)}
                    className="text-xs text-orange-600 hover:underline"
                  >
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
