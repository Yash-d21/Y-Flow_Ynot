import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { absoluteStoragePath, deleteStoredFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = session.user.role === "STAFF" || session.user.role === "ADMIN";
  const isOwnCompany =
    session.user.role === "CLIENT" && session.user.companyId === asset.companyId;
  if (!isStaff && !isOwnCompany) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const abs = absoluteStoragePath(asset.path);
    const st = await stat(abs);
    const nodeStream = createReadStream(abs);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const isImage = (asset.mimeType || "").startsWith("image/");

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Length": String(st.size),
        "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename="${asset.originalName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.companyAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = session.user.role === "STAFF" || session.user.role === "ADMIN";
  const isOwnCompany =
    session.user.role === "CLIENT" && session.user.companyId === asset.companyId;
  if (!isStaff && !isOwnCompany) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteStoredFile(asset.path);
  await prisma.companyAsset.delete({ where: { id: asset.id } });

  if (asset.kind === "LOGO") {
    const company = await prisma.company.findUnique({ where: { id: asset.companyId } });
    if (company?.logoUrl === `/api/company/files/${asset.id}`) {
      const nextLogo = await prisma.companyAsset.findFirst({
        where: { companyId: asset.companyId, kind: "LOGO" },
        orderBy: { createdAt: "desc" },
      });
      await prisma.company.update({
        where: { id: asset.companyId },
        data: { logoUrl: nextLogo ? `/api/company/files/${nextLogo.id}` : null },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
