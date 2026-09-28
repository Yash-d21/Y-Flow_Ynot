import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/**
 * On Vercel the filesystem is read-only except /tmp.
 * Copy the committed seed DB into /tmp so Prisma can read/write for the instance lifetime.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && !process.env.VERCEL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VERCEL) {
    const target = "/tmp/yflow.db";
    const source = path.join(process.cwd(), "prisma", "dev.db");
    try {
      if (fs.existsSync(source)) {
        // Refresh from seed if missing or empty
        if (!fs.existsSync(target) || fs.statSync(target).size < 1024) {
          fs.copyFileSync(source, target);
        }
      }
    } catch (err) {
      console.error("Failed to prepare /tmp SQLite DB", err);
    }
    return `file:${target}`;
  }

  return process.env.DATABASE_URL || "file:./dev.db";
}

const databaseUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
