import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@/lib/types";

declare module "next-auth" {
  interface User {
    role: Role;
    companyId?: string | null;
    companyName?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      companyId?: string | null;
      companyName?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    companyId?: string | null;
    companyName?: string | null;
  }
}

async function userWithCompany(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
}) {
  let companyName: string | null = null;
  if (user.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { name: true },
    });
    companyName = company?.name ?? null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    companyId: user.companyId,
    companyName,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        magicToken: { label: "Magic Token", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const magicToken = credentials?.magicToken as string | undefined;

        if (magicToken) {
          const link = await prisma.magicLink.findUnique({
            where: { token: magicToken },
            include: { user: true },
          });
          if (!link || link.usedAt || link.expiresAt < new Date()) return null;
          let user = link.user;
          if (!user) {
            user = await prisma.user.findUnique({ where: { email: link.email } });
          }
          if (!user || !user.active) return null;
          await prisma.magicLink.update({
            where: { id: link.id },
            data: { usedAt: new Date() },
          });
          return userWithCompany(user);
        }

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.active || !user.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return userWithCompany(user);
      },
    }),
  ],
});
