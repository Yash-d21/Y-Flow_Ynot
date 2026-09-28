import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const ROOT = path.join(process.cwd(), "storage");

export async function ensureStorage() {
  await fs.mkdir(path.join(ROOT, "orders"), { recursive: true });
  await fs.mkdir(path.join(ROOT, "companies"), { recursive: true });
}

async function writeStoredFile(
  relativeDir: string,
  file: File
): Promise<{ relativePath: string; size: number; mimeType: string }> {
  await ensureStorage();
  const dir = path.join(ROOT, relativeDir);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const full = path.join(dir, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(full, buf);

  return {
    relativePath: path.join(relativeDir, name),
    size: buf.length,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function saveOrderFile(
  orderId: string,
  file: File
): Promise<{ relativePath: string; size: number; mimeType: string }> {
  return writeStoredFile(path.join("orders", orderId), file);
}

export async function saveCompanyFile(
  companyId: string,
  file: File
): Promise<{ relativePath: string; size: number; mimeType: string }> {
  return writeStoredFile(path.join("companies", companyId), file);
}

export async function deleteStoredFile(relativePath: string) {
  try {
    await fs.unlink(absoluteStoragePath(relativePath));
  } catch {
    // missing on disk is fine
  }
}

export function absoluteStoragePath(relativePath: string) {
  const resolved = path.resolve(ROOT, relativePath);
  if (!resolved.startsWith(path.resolve(ROOT))) {
    throw new Error("Invalid path");
  }
  return resolved;
}
