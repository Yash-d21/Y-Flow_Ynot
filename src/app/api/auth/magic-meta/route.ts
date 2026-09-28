import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const link = await prisma.magicLink.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!link || link.usedAt || link.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link invalid or expired" }, { status: 400 });
  }

  let user = link.user;
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: link.email } });
  }
  if (!user) {
    return NextResponse.json({ error: "No account for this link" }, { status: 404 });
  }

  let redirectTo = user.role === "CLIENT" ? "/client" : "/staff";
  if (link.purpose === "PROOF_REVIEW" && link.orderId) {
    redirectTo = `/client/orders/${link.orderId}`;
  }

  return NextResponse.json({ ok: true, redirectTo });
}
