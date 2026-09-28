import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { saveCompanyFile } from "@/lib/storage";

const ALLOWED_KINDS = new Set(["LOGO", "BRAND", "ARTWORK", "OTHER"]);
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

const LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "application/pdf",
  "application/postscript",
  "application/illustrator",
  "image/vnd.adobe.photoshop",
]);

export async function GET() {
  const session = await auth();
  if (!session?.user.companyId || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.companyAsset.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user.companyId || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kindRaw = String(form.get("kind") || "OTHER").toUpperCase();
  const kind = ALLOWED_KINDS.has(kindRaw) ? kindRaw : "OTHER";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  if (kind === "LOGO") {
    const mime = file.type || "application/octet-stream";
    const looksLikeLogo =
      LOGO_MIME.has(mime) ||
      /\.(png|jpe?g|webp|gif|svg|pdf|ai|eps|psd)$/i.test(file.name);
    if (!looksLikeLogo) {
      return NextResponse.json(
        { error: "Logos must be an image, PDF, or design file (AI/EPS/PSD)" },
        { status: 400 }
      );
    }
  }

  const saved = await saveCompanyFile(session.user.companyId, file);
  const asset = await prisma.companyAsset.create({
    data: {
      companyId: session.user.companyId,
      kind,
      path: saved.relativePath,
      originalName: file.name,
      mimeType: saved.mimeType,
      sizeBytes: saved.size,
      uploadedById: session.user.id,
    },
  });

  if (kind === "LOGO") {
    await prisma.company.update({
      where: { id: session.user.companyId },
      data: { logoUrl: `/api/company/files/${asset.id}` },
    });
  }

  return NextResponse.json(asset);
}
