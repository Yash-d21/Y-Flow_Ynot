import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["ADMIN", "STAFF", "CLIENT"]),
      companyId: z.string().optional(),
    })
    .parse(await req.json());

  if (body.role === "CLIENT" && !body.companyId) {
    return NextResponse.json({ error: "companyId required for clients" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 400 });
  }

  const passwordHash = await hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: body.role,
      companyId: body.role === "CLIENT" ? body.companyId : null,
    },
  });

  await sendMail({
    to: user.email,
    subject: "Your Y-Flow account",
    text: `Hi ${user.name},\n\nAn account was created for you on Y-Flow.\nEmail: ${user.email}\nTemp password: ${body.password}\n\nSign in: ${process.env.APP_URL || "http://localhost:3000"}/login\n`,
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = z
    .object({ id: z.string(), active: z.boolean() })
    .parse(await req.json());
  const user = await prisma.user.update({
    where: { id: body.id },
    data: { active: body.active },
  });
  return NextResponse.json(user);
}
