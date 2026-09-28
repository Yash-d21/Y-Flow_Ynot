import { prisma } from "@/lib/db";
import { inferCategory } from "@/lib/catalog";
import type { ChatProduct } from "@/lib/chat-content";

export type { ChatProduct };
export { attachProductsToReply, parseChatContent } from "@/lib/chat-content";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "want",
  "need",
  "looking",
  "please",
  "some",
  "about",
  "into",
  "show",
  "find",
  "get",
  "can",
  "you",
  "me",
  "our",
  "any",
  "product",
  "products",
  "item",
  "items",
  "branded",
  "custom",
  "something",
]);

export async function searchCatalogProducts(
  query: string,
  limit = 6
): Promise<ChatProduct[]> {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const categoryGuess = inferCategory(query);

  const all = await prisma.product.findMany({
    where: { active: true },
    take: 400,
  });

  const scored = all
    .map((p) => {
      const hay = `${p.name} ${p.category} ${p.slug}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (hay.includes(w)) score += w.length > 4 ? 3 : 2;
      }
      if (p.category === categoryGuess && categoryGuess !== "Premium Brands") {
        score += 4;
      }
      if (p.localImage || p.imageUrl) score += 0.5;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top =
    scored.length > 0
      ? scored.slice(0, limit)
      : all
          .filter((p) => p.category === categoryGuess)
          .slice(0, limit)
          .map((p) => ({ p, score: 1 }));

  const picked =
    top.length > 0
      ? top
      : all.slice(0, limit).map((p) => ({ p, score: 0 }));

  return picked.map(({ p }) => ({
    id: p.id,
    externalId: p.externalId,
    name: p.name,
    slug: p.slug,
    category: p.category,
    priceLabel: p.priceLabel,
    priceUsd: p.priceUsd,
    image: p.localImage || p.imageUrl,
    imageUrl: p.imageUrl,
  }));
}

export function formatProductsForPrompt(products: ChatProduct[]): string {
  if (!products.length) return "(no matching catalog products)";
  return products
    .map(
      (p, i) =>
        `${i + 1}. id=${p.id} | sku=#${p.externalId} | ${p.name} | ${p.category} | ${p.priceLabel} | image=${p.image || "none"}`
    )
    .join("\n");
}
