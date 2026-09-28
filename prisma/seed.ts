import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORD } from "../src/lib/demo-accounts";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderProposal.deleteMany().catch(() => undefined);
  await prisma.orderEvent.deleteMany();
  await prisma.orderFile.deleteMany();
  await prisma.proofReview.deleteMany();
  await prisma.magicLink.deleteMany();
  await prisma.handoff.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const google = await prisma.company.create({
    data: { name: "Google" },
  });

  const passwordHash = await hash(DEMO_PASSWORD, 10);

  const staff = await prisma.user.create({
    data: {
      email: "staff@y-not.com",
      name: "Y-Not Staff",
      role: "STAFF",
      passwordHash,
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "client@y-not.com",
      name: "Google Buyer",
      role: "CLIENT",
      companyId: google.id,
      passwordHash,
    },
  });

  // Prefer real catalog SKUs so previews have images
  const tumbler =
    (await prisma.product.findFirst({
      where: { active: true, localImage: { not: null }, name: { contains: "Tumbler" } },
    })) ||
    (await prisma.product.findFirst({
      where: { active: true, localImage: { not: null } },
    }));

  const apparel =
    (await prisma.product.findFirst({
      where: {
        active: true,
        localImage: { not: null },
        category: "Apparel",
        NOT: tumbler ? { id: tumbler.id } : undefined,
      },
    })) ||
    (await prisma.product.findFirst({
      where: { active: true, localImage: { not: null }, NOT: tumbler ? { id: tumbler.id } : undefined },
    }));

  const order1 = await prisma.order.create({
    data: {
      number: "YN-1042",
      companyId: google.id,
      productId: tumbler?.id,
      title: tumbler?.name || "Custom branded drinkware",
      productDescription: tumbler
        ? `Catalog order: ${tumbler.name} (${tumbler.priceLabel}). Employee gifting program.`
        : "Branded drinkware for employee program",
      quantity: 500,
      unitPriceLabel: tumbler?.priceLabel,
      budget: tumbler ? `Catalog ${tumbler.priceLabel} / unit` : "$45–60 / unit",
      deadline: new Date("2026-10-12"),
      status: "QUOTE",
      assigneeId: staff.id,
      createdById: client.id,
    },
  });

  await prisma.orderProposal.create({
    data: {
      orderId: order1.id,
      title: "Standard decoration package",
      details: "Logo print, gift box, QC + US fulfillment.",
      price: tumbler ? `${tumbler.priceLabel} + decoration` : "$52 / unit · MOQ 250",
      leadTime: "6–8 weeks",
      status: "PENDING",
      createdById: staff.id,
    },
  });

  await prisma.orderEvent.createMany({
    data: [
      {
        orderId: order1.id,
        actorId: client.id,
        type: "CREATED",
        message: "Client created order request",
        toStatus: "LEAD",
      },
      {
        orderId: order1.id,
        actorId: staff.id,
        type: "PROPOSAL",
        message: "Staff sent proposal: Standard decoration package",
        fromStatus: "LEAD",
        toStatus: "QUOTE",
      },
    ],
  });

  const proofOrder = await prisma.order.create({
    data: {
      number: "YN-1038",
      companyId: google.id,
      productId: apparel?.id,
      title: apparel?.name || "Employee gift apparel",
      productDescription: apparel
        ? `Catalog order: ${apparel.name} (${apparel.priceLabel}). Welcome kit apparel.`
        : "Welcome kit with apparel",
      quantity: 200,
      unitPriceLabel: apparel?.priceLabel,
      deadline: new Date("2026-10-18"),
      status: "PROOF",
      assigneeId: staff.id,
      createdById: client.id,
    },
  });

  await prisma.proofReview.create({
    data: { orderId: proofOrder.id, status: "PENDING" },
  });

  console.log("Seeded:");
  console.log("  staff@y-not.com (STAFF) — use Test Staff on /login");
  console.log("  client@y-not.com (CLIENT · Google) — use Test Client on /login");
  console.log("  YN-1042 product:", tumbler?.name || "(none)");
  console.log("  YN-1038 product:", apparel?.name || "(none)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
