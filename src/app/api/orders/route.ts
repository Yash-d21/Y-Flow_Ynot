import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mail";

const schema = z.object({
  companyId: z.string().optional(),
  productId: z.string().optional(),
  title: z.string().min(2).optional(),
  productDescription: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  budget: z.string().optional(),
  deadline: z.string().optional(),
  complianceNotes: z.string().optional(),
  brandingNotes: z.string().optional(),
  status: z.string().optional(),
  custom: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const isStaff = session.user.role === "STAFF" || session.user.role === "ADMIN";
  const isClient = session.user.role === "CLIENT";

  if (!isStaff && !isClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let companyId = body.companyId;
  if (isClient) {
    if (!session.user.companyId) {
      return NextResponse.json({ error: "Client has no company" }, { status: 400 });
    }
    companyId = session.user.companyId;
  }
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  let product = null;
  if (body.productId) {
    product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product || !product.active) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  }

  if (!product && !body.title) {
    return NextResponse.json(
      { error: "Select a catalog product or provide a custom title" },
      { status: 400 }
    );
  }

  const title = product?.name || body.title!;
  const productDescription =
    body.productDescription?.trim() ||
    (product
      ? `Catalog order: ${product.name} (${product.priceLabel}). Category: ${product.category}. Source: ${product.source || "Y-Not Premium Brands"}.`
      : "Custom project brief");

  const count = await prisma.order.count();
  const number = `YN-${1000 + count + 1}`;

  // Client submissions start as Brief; staff can still create Leads
  const initialStatus = isClient ? "BRIEF" : body.status || "LEAD";

  const order = await prisma.order.create({
    data: {
      number,
      companyId,
      productId: product?.id,
      title,
      productDescription,
      quantity: body.quantity,
      unitPriceLabel: product?.priceLabel,
      budget: body.budget || (product ? `Catalog ${product.priceLabel} / unit` : undefined),
      deadline: body.deadline ? new Date(body.deadline) : null,
      complianceNotes: body.complianceNotes,
      brandingNotes: body.brandingNotes,
      status: initialStatus,
      assigneeId: isStaff ? session.user.id : null,
      createdById: session.user.id,
    },
    include: { product: true },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      actorId: session.user.id,
      type: "CREATED",
      message: product
        ? `Ordered catalog product: ${product.name} × ${body.quantity}`
        : isClient
          ? "Client submitted custom order request"
          : "Order created by staff",
      toStatus: order.status,
    },
  });

  if (isClient) {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] }, active: true },
    });
    const emails = staff.map((s) => s.email);
    if (emails.length) {
      await sendMail({
        to: emails,
        subject: `New client order ${number} — ${title}`,
        text: `${session.user.name} (${session.user.email}) submitted order ${number}.\n\nProduct: ${title}\nQty: ${body.quantity}\nUnit: ${order.unitPriceLabel || "—"}\nBranding: ${body.brandingNotes || "—"}\n\n${productDescription}\n\nOpen: ${process.env.APP_URL || "http://localhost:3000"}/staff/orders/${order.id}`,
      });
    }
  }

  return NextResponse.json(order);
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "CLIENT") {
    if (!session.user.companyId) return NextResponse.json([]);
    const orders = await prisma.order.findMany({
      where: { companyId: session.user.companyId },
      include: { company: true, assignee: true, proposals: true, product: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(orders);
  }

  if (session.user.role !== "STAFF" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    include: { company: true, assignee: true, proposals: true, product: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(orders);
}
