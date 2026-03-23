import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEV_PASSWORD = "diediedie";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { password } = await req.json();

  if (password !== DEV_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.throw.deleteMany({ where: { gameId: id } });
  await prisma.gamePlayer.deleteMany({ where: { gameId: id } });
  await prisma.game.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
