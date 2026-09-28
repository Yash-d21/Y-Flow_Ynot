import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrdersBoard } from "@/components/orders-board";
import { redirect } from "next/navigation";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user.companyId) redirect("/login");

  const orders = await prisma.order.findMany({
    where: {
      companyId: session.user.companyId,
      status: "PROOF",
      proofReviews: { some: { status: "PENDING" } },
    },
    select: {
      id: true,
      number: true,
      title: true,
      productDescription: true,
      quantity: true,
      status: true,
      deadline: true,
      updatedAt: true,
      company: { select: { id: true, name: true } },
      product: {
        select: { localImage: true, imageUrl: true },
      },
      files: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          kind: true,
          originalName: true,
          createdAt: true,
        },
      },
      proofReviews: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = orders.map((o) => ({
    id: o.id,
    number: o.number,
    title: o.title,
    productDescription: o.productDescription,
    quantity: o.quantity,
    status: o.status,
    deadline: o.deadline?.toISOString() ?? null,
    company: o.company,
    productImage: o.product?.localImage || o.product?.imageUrl || null,
    productImageUrl: o.product?.imageUrl || null,
    files: o.files.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    })),
    proofReviews: o.proofReviews,
  }));

  return <OrdersBoard orders={rows} title="Approvals" mode="client" showNew={false} />;
}
