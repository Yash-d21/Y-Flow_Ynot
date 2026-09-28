import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffSidebar } from "@/components/staff-sidebar";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    redirect("/login");
  }

  return <StaffSidebar name={session.user.name}>{children}</StaffSidebar>;
}
