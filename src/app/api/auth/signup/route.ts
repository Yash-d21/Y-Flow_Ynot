import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { sendLoginMagicLink } from "@/lib/magic-link";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(2),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    let company = await prisma.company.findFirst({
      where: { name: data.companyName },
    });
    if (!company) {
      company = await prisma.company.create({ data: { name: data.companyName } });
    }

    const passwordHash = await hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash,
        role: "CLIENT",
        companyId: company.id,
      },
    });

    const staff = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] }, active: true },
    });
    const staffEmails = staff.map((s) => s.email);
    // Always include primary staff inbox
    if (!staffEmails.includes("staff@y-not.com")) {
      staffEmails.push("staff@y-not.com");
    }

    await sendMail({
      to: staffEmails,
      subject: `New client signup — ${data.companyName}`,
      text: `A new client created an account.\n\nName: ${data.name}\nEmail: ${email}\nCompany: ${data.companyName}\n\nStaff portal: ${process.env.APP_URL || "http://localhost:3000"}/staff/clients`,
    });

    await sendMail({
      to: email,
      subject: "Welcome to Y-Flow",
      text: `Hi ${data.name},\n\nYour Y-Flow client account is ready.\n\nSign in: ${process.env.APP_URL || "http://localhost:3000"}/login\nEmail: ${email}\n\nYou can also request a magic link from the login page.\n`,
    });

    try {
      await sendLoginMagicLink(email, user.id);
    } catch (err) {
      console.error("magic link after signup failed", err);
    }

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
