import { prisma } from "@/lib/db";
import { NAV_STATUS_FILTER } from "@/lib/orders";
import { OrdersBoard } from "@/components/orders-board";

export async function getStaffOrders(filterKey: string) {
  const statuses = NAV_STATUS_FILTER[filterKey];
  const orders = await prisma.order.findMany({
    where: statuses ? { status: { in: statuses } } : undefined,
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
      assignee: { select: { id: true, name: true } },
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

  return orders.map((o) => ({
    id: o.id,
    number: o.number,
    title: o.title,
    productDescription: o.productDescription,
    quantity: o.quantity,
    status: o.status,
    deadline: o.deadline?.toISOString() ?? null,
    company: o.company,
    assignee: o.assignee,
    productImage: o.product?.localImage || o.product?.imageUrl || null,
    productImageUrl: o.product?.imageUrl || null,
    files: o.files.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    })),
    proofReviews: o.proofReviews,
  }));
}

export async function StaffOrdersView({
  filter,
  title,
}: {
  filter: string;
  title: string;
}) {
  const orders = await getStaffOrders(filter);
  return <OrdersBoard orders={orders} title={title} mode="staff" />;
}
