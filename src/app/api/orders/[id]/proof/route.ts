import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

const schema = z.object({
  action: z.enum(["APPROVE", "REQUEST_CHANGES"]),
  note: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = schema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      assignee: true,
      proofReviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const review = order.proofReviews[0];
  if (!review || review.status !== "PENDING") {
    return NextResponse.json({ error: "No pending proof review" }, { status: 400 });
  }

  const status = body.action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
  await prisma.proofReview.update({
    where: { id: review.id },
    data: {
      status,
      clientNote: body.note,
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
  });

  if (body.action === "APPROVE") {
    await prisma.order.update({
      where: { id },
      data: { status: "PRODUCTION" },
    });
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        actorId: session.user.id,
        type: "PROOF",
        message: `Client approved proof${body.note ? `: ${body.note}` : ""}`,
        fromStatus: "PROOF",
        toStatus: "PRODUCTION",
      },
    });
  } else {
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        actorId: session.user.id,
        type: "PROOF",
        message: `Client requested changes${body.note ? `: ${body.note}` : ""}`,
        fromStatus: "PROOF",
        toStatus: "PROOF",
      },
    });
  }

  const staffEmails: string[] = [];
  if (order.assignee?.email) staffEmails.push(order.assignee.email);
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] }, active: true },
  });
  for (const a of admins) {
    if (!staffEmails.includes(a.email)) staffEmails.push(a.email);
  }

  await sendMail({
    to: staffEmails,
    subject: `Proof ${status.toLowerCase()} — ${order.number}`,
    text: `${session.user.name} ${body.action === "APPROVE" ? "approved" : "requested changes on"} proof for ${order.number}.\n\nNote: ${body.note || "—"}\n\nOpen: ${process.env.APP_URL || "http://localhost:3000"}/staff/orders/${id}`,
  });

  return NextResponse.json({ ok: true, status });
}
