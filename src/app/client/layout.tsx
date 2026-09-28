import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClientSidebar } from "@/components/client-sidebar";
import { LazyChatBubble } from "@/components/chat/lazy-chat-bubble";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "CLIENT") {
    redirect("/login");
  }

  let companyName = session.user.companyName || "";
  if (!companyName && session.user.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    });
    companyName = company?.name || "";
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F7F8]">
      <ClientSidebar name={session.user.name} companyName={companyName || "Your company"} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
        <LazyChatBubble
          userName={session.user.name}
          userEmail={session.user.email}
          companyName={companyName}
        />
      </main>
    </div>
  );
}
