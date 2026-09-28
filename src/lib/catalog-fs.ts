import fs from "fs";
import path from "path";

/** Find on-disk folder for a product (export uses numbered prefixes). Server-only. */
export function findProductFolder(exportProductsDir: string, slug: string): string | null {
  if (!fs.existsSync(exportProductsDir)) return null;
  const dirs = fs.readdirSync(exportProductsDir);
  const match = dirs.find((d) => d.endsWith(`-${slug}`) || d === slug);
  return match ? path.join(exportProductsDir, match) : null;
}
