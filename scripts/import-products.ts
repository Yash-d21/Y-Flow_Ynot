/**
 * Import products from y-not-export into SQLite + public/products images.
 * Usage: npx tsx --env-file=.env scripts/import-products.ts
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { inferCategory, type ExportProduct } from "../src/lib/catalog";
import { findProductFolder } from "../src/lib/catalog-fs";

const prisma = new PrismaClient();

const EXPORT_ROOT =
  process.env.YNOT_EXPORT_PATH ||
  path.join("C:", "Users", "Yashwanth", "Desktop", "y-not-chatbot", "y-not-export");

async function main() {
  const indexPath = path.join(EXPORT_ROOT, "products", "index.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath}`);
  }

  const products: ExportProduct[] = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const publicRoot = path.join(process.cwd(), "public", "products");
  fs.mkdirSync(publicRoot, { recursive: true });

  console.log(`Importing ${products.length} products from ${EXPORT_ROOT}`);

  let imagesCopied = 0;
  for (const p of products) {
    const folder = findProductFolder(path.join(EXPORT_ROOT, "products"), p.slug);
    let localPublic: string | null = null;

    if (folder && p.local_image) {
      const src = path.join(folder, p.local_image);
      if (fs.existsSync(src)) {
        const destDir = path.join(publicRoot, p.slug);
        fs.mkdirSync(destDir, { recursive: true });
        const dest = path.join(destDir, "image.jpg");
        fs.copyFileSync(src, dest);
        localPublic = `/products/${p.slug}/image.jpg`;
        imagesCopied++;
      }
    }

    await prisma.product.upsert({
      where: { externalId: p.id },
      create: {
        externalId: p.id,
        name: p.name,
        slug: p.slug,
        category: inferCategory(p.name),
        priceLabel: p.price,
        priceUsd: p.price_usd,
        imageUrl: p.image_url,
        localImage: localPublic,
        storeUrl: p.store || null,
        source: p.source || null,
        active: true,
      },
      update: {
        name: p.name,
        slug: p.slug,
        category: inferCategory(p.name),
        priceLabel: p.price,
        priceUsd: p.price_usd,
        imageUrl: p.image_url,
        localImage: localPublic ?? undefined,
        storeUrl: p.store || null,
        source: p.source || null,
        active: true,
      },
    });
  }

  const count = await prisma.product.count();
  console.log(`Done. DB products: ${count}. Images copied: ${imagesCopied}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
