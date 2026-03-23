import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; adjId: string }> }
) {
  const { adjId } = await params;
  await prisma.gameAdjustment.delete({ where: { id: adjId } });
  return NextResponse.json({ ok: true });
}
