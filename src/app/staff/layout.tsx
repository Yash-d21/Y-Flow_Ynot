import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffSidebar } from "@/components/staff-sidebar";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F8]">
      <StaffSidebar name={session.user.name} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
