import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role === "CLIENT" && order.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const proposals = await prisma.orderProposal.findMany({
    where: { orderId: id },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(proposals);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = z
    .object({
      title: z.string().min(2),
      details: z.string().min(2),
      price: z.string().optional(),
      leadTime: z.string().optional(),
    })
    .parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id },
    include: { company: { include: { users: { where: { role: "CLIENT", active: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Proposals only during intake / brief / open proposal stage
  const proposalStages = new Set(["LEAD", "BRIEF", "QUOTE"]);
  if (!proposalStages.has(order.status)) {
    return NextResponse.json(
      {
        error: `Proposals can't be sent after the order has moved to ${order.status}. Move status back to Brief or Proposal first if you need to re-quote.`,
      },
      { status: 400 }
    );
  }

  const proposal = await prisma.orderProposal.create({
    data: {
      orderId: id,
      title: body.title,
      details: body.details,
      price: body.price,
      leadTime: body.leadTime,
      status: "PENDING",
      createdById: session.user.id,
    },
  });

  await prisma.order.update({
    where: { id },
    data: { status: "QUOTE", assigneeId: session.user.id },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: id,
      actorId: session.user.id,
      type: "PROPOSAL",
      message: `Proposal sent: ${body.title}`,
      fromStatus: order.status,
      toStatus: "QUOTE",
    },
  });

  for (const client of order.company.users) {
    await sendMail({
      to: client.email,
      subject: `New proposal on ${order.number}`,
      text: `Hi ${client.name},\n\nY-Not sent a proposal for ${order.number} (${order.title}).\n\n${body.title}\n${body.price || ""}\n${body.leadTime || ""}\n\n${body.details}\n\nReview & accept/reject:\n${process.env.APP_URL || "http://localhost:3000"}/client/orders/${id}\n`,
    });
  }

  return NextResponse.json(proposal);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: orderId } = await params;
  const body = z
    .object({
      proposalId: z.string(),
      action: z.enum(["ACCEPT", "REJECT"]),
      note: z.string().optional(),
    })
    .parse(await req.json());

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const proposal = await prisma.orderProposal.findFirst({
    where: { id: body.proposalId, orderId },
  });
  if (!proposal || proposal.status !== "PENDING") {
    return NextResponse.json({ error: "No pending proposal" }, { status: 400 });
  }

  const status = body.action === "ACCEPT" ? "ACCEPTED" : "REJECTED";
  await prisma.orderProposal.update({
    where: { id: proposal.id },
    data: {
      status,
      clientNote: body.note,
      decidedAt: new Date(),
    },
  });

  if (body.action === "ACCEPT") {
    // Reject other pending proposals
    await prisma.orderProposal.updateMany({
      where: { orderId, status: "PENDING", id: { not: proposal.id } },
      data: { status: "REJECTED", decidedAt: new Date(), clientNote: "Superseded by accepted proposal" },
    });
    // Accepted proposal → move into Proof stage for artwork approval
    await prisma.order.update({ where: { id: orderId }, data: { status: "PROOF" } });
    await prisma.proofReview.create({
      data: { orderId, status: "PENDING" },
    });
    await prisma.orderEvent.create({
      data: {
        orderId,
        actorId: session.user.id,
        type: "PROPOSAL",
        message: `Client accepted proposal: ${proposal.title}`,
        fromStatus: "QUOTE",
        toStatus: "PROOF",
      },
    });
  } else {
    await prisma.orderEvent.create({
      data: {
        orderId,
        actorId: session.user.id,
        type: "PROPOSAL",
        message: `Client rejected proposal: ${proposal.title}${body.note ? ` — ${body.note}` : ""}`,
        fromStatus: "QUOTE",
        toStatus: "QUOTE",
      },
    });
  }

  const staff = await prisma.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN"] }, active: true },
  });
  await sendMail({
    to: staff.map((s) => s.email),
    subject: `Proposal ${status.toLowerCase()} — ${order.number}`,
    text: `${session.user.name} ${body.action === "ACCEPT" ? "accepted" : "rejected"} proposal "${proposal.title}" on ${order.number}.\nNote: ${body.note || "—"}\n\n${process.env.APP_URL || "http://localhost:3000"}/staff/orders/${orderId}`,
  });

  return NextResponse.json({ ok: true, status });
}
