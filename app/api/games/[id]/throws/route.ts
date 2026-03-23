import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const throws = await prisma.throw.findMany({
    where: { gameId: id },
    orderBy: { createdAt: "asc" },
    include: {
      thrower: true,
      catcher: true,
      faultPlayer: true,
    },
  });
  return NextResponse.json(throws);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const body = await req.json();

  const { throwerId, isHit, isScored, scoreType, catcherId, faultPlayerId, saveDifficulty } = body;

  if (!throwerId || isHit === undefined) {
    return NextResponse.json({ error: "throwerId and isHit are required" }, { status: 400 });
  }

  try {
    const created = await prisma.throw.create({
      data: {
        gameId,
        throwerId,
        isHit,
        isScored: isHit ? isScored : null,
        scoreType: isHit && isScored ? (scoreType ?? "regular") : null,
        catcherId: isHit && !isScored ? catcherId ?? null : null,
        faultPlayerId: isHit && isScored ? faultPlayerId ?? null : null,
        saveDifficulty: isHit && saveDifficulty !== undefined ? saveDifficulty : null,
      },
    });

    const t = await prisma.throw.findUnique({
      where: { id: created.id },
      include: { thrower: true, catcher: true, faultPlayer: true },
    });

    return NextResponse.json(t, { status: 201 });
  } catch (e) {
    console.error("POST throws error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
