import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; throwId: string }> }
) {
  const { throwId } = await params;
  await prisma.throw.delete({ where: { id: throwId } });
  return NextResponse.json({ success: true });
}
