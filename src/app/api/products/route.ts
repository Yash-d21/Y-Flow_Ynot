import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const q = (url.searchParams.get("q") || "").trim();
  const category = url.searchParams.get("category") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(48, Math.max(12, Number(url.searchParams.get("pageSize") || 24)));

  if (id) {
    const product = await prisma.product.findFirst({
      where: { id, active: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Not found", products: [] }, { status: 404 });
    }
    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        priceLabel: product.priceLabel,
        priceUsd: product.priceUsd,
        localImage: product.localImage,
        imageUrl: product.imageUrl,
        image: product.localImage || product.imageUrl,
      },
      products: [
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category,
          priceLabel: product.priceLabel,
          priceUsd: product.priceUsd,
          localImage: product.localImage,
          imageUrl: product.imageUrl,
          image: product.localImage || product.imageUrl,
        },
      ],
    });
  }

  const where = {
    active: true,
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { category: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      priceLabel: p.priceLabel,
      priceUsd: p.priceUsd,
      localImage: p.localImage,
      imageUrl: p.imageUrl,
      image: p.localImage || p.imageUrl,
    })),
    categories: categories.map((c) => c.category),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  });
}
