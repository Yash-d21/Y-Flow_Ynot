import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendLoginMagicLink } from "@/lib/magic-link";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active) {
      return NextResponse.json({ error: "No account found for that email" }, { status: 404 });
    }
    await sendLoginMagicLink(user.email, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 });
  }
}
