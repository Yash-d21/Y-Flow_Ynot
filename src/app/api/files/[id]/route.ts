import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { absoluteStoragePath } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.orderFile.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "CLIENT" && file.order.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const abs = absoluteStoragePath(file.path);
    const st = await stat(abs);
    const nodeStream = createReadStream(abs);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": String(st.size),
        "Content-Disposition": `attachment; filename="${file.originalName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 404 });
  }
}
