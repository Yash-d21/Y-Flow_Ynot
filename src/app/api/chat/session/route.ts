import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Client polls messages for an active / handed-off session */
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      handoff: true,
    },
  });

  if (!chatSession || (chatSession.userId && chatSession.userId !== session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: chatSession.id,
    status: chatSession.status,
    handoffStatus: chatSession.handoff?.status ?? null,
    messages: chatSession.messages,
  });
}
