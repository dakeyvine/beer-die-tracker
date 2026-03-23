import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const adjustments = await prisma.gameAdjustment.findMany({
    where: { gameId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(adjustments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params;
  const { team, delta, comment } = await req.json();

  if (!team || delta === undefined || !comment?.trim()) {
    return NextResponse.json({ error: "team, delta, and comment are required" }, { status: 400 });
  }

  try {
    const adj = await prisma.gameAdjustment.create({
      data: { gameId, team, delta: Number(delta), comment: comment.trim() },
    });
    return NextResponse.json(adj, { status: 201 });
  } catch (e) {
    console.error("POST adjustments error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
