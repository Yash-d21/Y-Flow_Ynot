import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

const createSchema = z.object({
  sessionId: z.string().optional().nullable(),
  summary: z.string().min(1),
  visitorName: z.string().optional(),
  visitorEmail: z.string().optional(),
  companyName: z.string().optional(),
  orderId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handoffs = await prisma.handoff.findMany({
    include: {
      session: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      claimedBy: true,
      order: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(handoffs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await req.json());

    let chatSession = body.sessionId
      ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
      : null;

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          visitorName: body.visitorName || session.user.name,
          visitorEmail: body.visitorEmail || session.user.email,
          companyName: body.companyName,
          status: "HANDED_OFF",
        },
      });
    } else {
      await prisma.chatSession.update({
        where: { id: chatSession.id },
        data: { status: "HANDED_OFF" },
      });
    }

    const existing = await prisma.handoff.findUnique({
      where: { sessionId: chatSession.id },
    });
    if (existing) {
      return NextResponse.json({ ok: true, sessionId: chatSession.id, handoffId: existing.id });
    }

    const handoff = await prisma.handoff.create({
      data: {
        sessionId: chatSession.id,
        summary: body.summary,
        visitorName: body.visitorName || session.user.name,
        visitorEmail: body.visitorEmail || session.user.email,
        companyName: body.companyName,
        orderId: body.orderId,
        status: "OPEN",
      },
    });

    const staff = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] }, active: true },
    });
    const emails = staff.map((s) => s.email);
    if (emails.length) {
      await sendMail({
        to: emails,
        subject: `Y-Flow handoff — ${handoff.visitorName || "Client"}`,
        text: `A client requested a human.\n\nFrom: ${handoff.visitorName} <${handoff.visitorEmail}>\nCompany: ${handoff.companyName || "—"}\n\nSummary:\n${handoff.summary}\n\nOpen Staff Inbox: ${process.env.APP_URL || "http://localhost:3000"}/staff/inbox`,
      });
    }

    return NextResponse.json({
      ok: true,
      sessionId: chatSession.id,
      handoffId: handoff.id,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid handoff" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Handoff failed" }, { status: 500 });
  }
}
