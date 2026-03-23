import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const games = await prisma.game.findMany({
    orderBy: { playedAt: "desc" },
    include: {
      players: {
        include: { player: true },
      },
      _count: { select: { throws: true } },
    },
  });
  return NextResponse.json(games);
}

export async function POST(req: Request) {
  // Body: { teamA: string[], teamB: string[] } (player ids)
  try {
    const { teamA, teamB } = await req.json();
    if (!teamA?.length || !teamB?.length) {
      return NextResponse.json({ error: "Both teams need at least 1 player" }, { status: 400 });
    }

    const game = await prisma.game.create({ data: {} });

    const allPlayers = [
      ...teamA.map((id: string) => ({ gameId: game.id, playerId: id, team: "A" })),
      ...teamB.map((id: string) => ({ gameId: game.id, playerId: id, team: "B" })),
    ];
    for (const p of allPlayers) {
      await prisma.gamePlayer.create({ data: p });
    }

    const full = await prisma.game.findUnique({
      where: { id: game.id },
      include: { players: { include: { player: true } } },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error("POST /api/games error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
