import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { orders: true, users: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = z.object({ name: z.string().min(2) }).parse(await req.json());
  const company = await prisma.company.create({ data: { name: body.name } });
  return NextResponse.json(company);
}
