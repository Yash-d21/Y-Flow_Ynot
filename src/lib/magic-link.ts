import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import type { MagicLinkPurpose } from "@/lib/types";

export async function createMagicLink(opts: {
  email: string;
  purpose: MagicLinkPurpose;
  userId?: string;
  orderId?: string;
  hoursValid?: number;
}) {
  const token = randomBytes(32).toString("hex");
  const hours = opts.hoursValid ?? 48;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await prisma.magicLink.create({
    data: {
      token,
      email: opts.email.toLowerCase(),
      purpose: opts.purpose,
      userId: opts.userId,
      orderId: opts.orderId,
      expiresAt,
    },
  });

  const base = process.env.APP_URL || "http://localhost:3000";
  const url = `${base}/magic?token=${token}`;
  return { token, url, expiresAt };
}

export async function sendProofReviewMagicLink(opts: {
  email: string;
  userId?: string;
  orderId: string;
  orderNumber: string;
  productTitle: string;
}) {
  const { url } = await createMagicLink({
    email: opts.email,
    purpose: "PROOF_REVIEW",
    userId: opts.userId,
    orderId: opts.orderId,
  });

  await sendMail({
    to: opts.email,
    subject: `Proof ready for review — ${opts.orderNumber}`,
    text: `Your proof for ${opts.orderNumber} (${opts.productTitle}) is ready for review.\n\nOpen your portal:\n${url}\n\nThis link expires in 48 hours. You can also log in at ${process.env.APP_URL || "http://localhost:3000"}/login`,
  });

  return url;
}

export async function sendLoginMagicLink(email: string, userId: string) {
  const { url } = await createMagicLink({
    email,
    purpose: "LOGIN",
    userId,
    hoursValid: 2,
  });

  await sendMail({
    to: email,
    subject: "Your Y-Flow sign-in link",
    text: `Click to sign in to Y-Flow:\n\n${url}\n\nThis link expires in 2 hours.`,
  });

  return url;
}
