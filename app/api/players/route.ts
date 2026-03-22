import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const player = await prisma.player.create({
    data: { name: name.trim() },
  });
  return NextResponse.json(player, { status: 201 });
}
