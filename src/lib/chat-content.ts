export type ChatProduct = {
  id: string;
  externalId: number;
  name: string;
  slug?: string;
  category: string;
  priceLabel: string;
  priceUsd?: number;
  image: string | null;
  imageUrl?: string | null;
};

const PRODUCTS_MARKER = "\n\n<!--YFLOW_PRODUCTS:";

export function attachProductsToReply(reply: string, products: ChatProduct[]): string {
  if (!products.length) return reply;
  const slim = products.map((p) => ({
    id: p.id,
    externalId: p.externalId,
    name: p.name,
    category: p.category,
    priceLabel: p.priceLabel,
    image: p.image,
    imageUrl: p.imageUrl || null,
  }));
  return `${reply.trim()}${PRODUCTS_MARKER}${JSON.stringify(slim)}-->`;
}

export function parseChatContent(content: string): {
  text: string;
  products: ChatProduct[];
} {
  const idx = content.indexOf(PRODUCTS_MARKER);
  if (idx === -1) return { text: content, products: [] };
  const text = content.slice(0, idx).trim();
  const rest = content.slice(idx + PRODUCTS_MARKER.length);
  const end = rest.lastIndexOf("-->");
  if (end === -1) return { text: content, products: [] };
  try {
    const products = JSON.parse(rest.slice(0, end)) as ChatProduct[];
    return { text, products };
  } catch {
    return { text: content, products: [] };
  }
}
