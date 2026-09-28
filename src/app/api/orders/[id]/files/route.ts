import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { saveOrderFile } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "CLIENT" && order.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "OTHER");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const saved = await saveOrderFile(id, file);
  const record = await prisma.orderFile.create({
    data: {
      orderId: id,
      kind,
      path: saved.relativePath,
      originalName: file.name,
      mimeType: saved.mimeType,
      sizeBytes: saved.size,
      uploadedById: session.user.id,
    },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: id,
      actorId: session.user.id,
      type: "FILE",
      message: `Uploaded ${file.name} (${kind})`,
    },
  });

  return NextResponse.json(record);
}
