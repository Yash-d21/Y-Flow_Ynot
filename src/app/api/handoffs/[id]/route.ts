import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

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
      action: z.enum(["claim", "close", "convert"]),
      title: z.string().optional(),
      productDescription: z.string().optional(),
    })
    .parse(await req.json());

  const handoff = await prisma.handoff.findUnique({
    where: { id },
    include: { session: true },
  });
  if (!handoff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "claim") {
    const updated = await prisma.handoff.update({
      where: { id },
      data: { status: "CLAIMED", claimedById: session.user.id },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "close") {
    const updated = await prisma.handoff.update({
      where: { id },
      data: { status: "CLOSED" },
    });
    await prisma.chatSession.update({
      where: { id: handoff.sessionId },
      data: { status: "CLOSED" },
    });
    return NextResponse.json(updated);
  }

  // convert → order
  let company = handoff.companyName
    ? await prisma.company.findFirst({ where: { name: handoff.companyName } })
    : null;
  if (!company && handoff.visitorEmail) {
    const clientUser = await prisma.user.findUnique({
      where: { email: handoff.visitorEmail.toLowerCase() },
    });
    if (clientUser?.companyId) {
      company = await prisma.company.findUnique({ where: { id: clientUser.companyId } });
    }
  }
  if (!company) {
    company = await prisma.company.create({
      data: { name: handoff.companyName || "New Client" },
    });
  }

  const count = await prisma.order.count();
  const number = `YN-${1000 + count + 1}`;

  const order = await prisma.order.create({
    data: {
      number,
      companyId: company.id,
      title: body.title || "New custom project",
      productDescription:
        body.productDescription || handoff.summary.slice(0, 500) || "From chat handoff",
      status: "LEAD",
      assigneeId: session.user.id,
      createdById: session.user.id,
    },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      actorId: session.user.id,
      type: "CREATED",
      message: `Created from handoff ${handoff.id}`,
      toStatus: "LEAD",
    },
  });

  await prisma.handoff.update({
    where: { id },
    data: { status: "CONVERTED", orderId: order.id, claimedById: session.user.id },
  });

  if (handoff.visitorEmail) {
    await sendMail({
      to: handoff.visitorEmail,
      subject: `We've opened order ${number}`,
      text: `Hi ${handoff.visitorName || "there"},\n\nYour request was converted to order ${number}.\nSign in to track it: ${process.env.APP_URL || "http://localhost:3000"}/login\n`,
    });
  }

  return NextResponse.json({ ok: true, order });
}
