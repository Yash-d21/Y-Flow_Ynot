import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/types";

/**
 * Edge-safe Auth.js config (no Prisma / Node fs).
 * Used by middleware; full providers live in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.companyId = token.companyId as string | null | undefined;
        session.user.companyName = token.companyName as string | null | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
