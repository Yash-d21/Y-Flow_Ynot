import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { sendProofReviewMagicLink } from "@/lib/magic-link";
import { ORDER_STATUSES, statusLabel } from "@/lib/orders";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      company: true,
      assignee: true,
      files: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, include: { actor: true } },
      proofReviews: { orderBy: { createdAt: "desc" } },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
      product: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "CLIENT" && order.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = z
    .object({
      status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
      note: z.string().optional(),
      title: z.string().optional(),
      quantity: z.number().optional(),
      budget: z.string().optional(),
      deadline: z.string().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
      notifyClient: z.boolean().optional(),
    })
    .parse(await req.json());

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { company: { include: { users: { where: { role: "CLIENT", active: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      title: body.title,
      quantity: body.quantity,
      budget: body.budget,
      deadline: body.deadline === undefined ? undefined : body.deadline ? new Date(body.deadline) : null,
      assigneeId: body.assigneeId === undefined ? undefined : body.assigneeId,
    },
  });

  if (body.status && body.status !== existing.status) {
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        actorId: session.user.id,
        type: "STATUS",
        message: body.note || `Status changed to ${statusLabel(body.status)}`,
        fromStatus: existing.status,
        toStatus: body.status,
      },
    });

    if (body.status === "PROOF") {
      const pending = await prisma.proofReview.findFirst({
        where: { orderId: id, status: "PENDING" },
      });
      if (!pending) {
        await prisma.proofReview.create({
          data: { orderId: id, status: "PENDING" },
        });
      }
      for (const client of existing.company.users) {
        await sendProofReviewMagicLink({
          email: client.email,
          userId: client.id,
          orderId: id,
          orderNumber: existing.number,
          productTitle: existing.title,
        });
      }
    }

    if (body.notifyClient || body.status === "SHIPPING" || body.status === "DELIVERED") {
      const label = statusLabel(body.status);
      for (const client of existing.company.users) {
        await sendMail({
          to: client.email,
          subject: `Order ${existing.number} update — ${label}`,
          text: `Your order ${existing.number} (${existing.title}) is now: ${label}.\n\nView: ${process.env.APP_URL || "http://localhost:3000"}/client/orders/${id}`,
        });
      }
    }
  }

  return NextResponse.json(updated);
}
