import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = z.object({ content: z.string().min(1).max(4000) }).parse(await req.json());

  const handoff = await prisma.handoff.findUnique({
    where: { id },
    include: { session: true },
  });
  if (!handoff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (handoff.status === "OPEN") {
    await prisma.handoff.update({
      where: { id },
      data: { status: "CLAIMED", claimedById: session.user.id },
    });
  }

  if (handoff.status === "CLOSED") {
    return NextResponse.json({ error: "Handoff is closed" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      sessionId: handoff.sessionId,
      role: "staff",
      content: body.content,
    },
  });

  if (handoff.visitorEmail) {
    await sendMail({
      to: handoff.visitorEmail,
      subject: `Reply from Y-Not staff`,
      text: `${session.user.name} replied:\n\n${body.content}\n\nOpen your portal chat: ${process.env.APP_URL || "http://localhost:3000"}/client\n`,
    });
  }

  return NextResponse.json(message);
}
