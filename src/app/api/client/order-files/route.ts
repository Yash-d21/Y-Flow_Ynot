import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user.companyId || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await prisma.orderFile.findMany({
    where: { order: { companyId: session.user.companyId } },
    include: { order: { select: { number: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    files: files.map((f) => ({
      id: f.id,
      kind: f.kind,
      originalName: f.originalName,
      createdAt: f.createdAt,
      orderNumber: f.order.number,
    })),
  });
}
