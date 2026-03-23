import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function scoreTypePoints(scoreType: string | null): number {
  if (scoreType === "tink") return 2;
  if (scoreType === "sink") return 4;
  return 1;
}

export async function GET() {
  const [players, games] = await Promise.all([
    prisma.player.findMany({
      include: { throws: true, catches: true, faults: true },
    }),
    prisma.game.findMany({
      include: {
        players: true,
        throws: true,
      },
    }),
  ]);

  const stats = players.map((p) => {
    // --- Offensive ---
    const totalThrows = p.throws.length;
    const hits = p.throws.filter((t) => t.isHit).length;
    const scoredThrows = p.throws.filter((t) => t.isScored === true);
    const scores = scoredThrows.length;
    const totalPoints = scoredThrows.reduce((sum, t) => sum + scoreTypePoints(t.scoreType), 0);
    const tinksAndSinks = scoredThrows.filter((t) => t.scoreType === "tink" || t.scoreType === "sink").length;

    // --- Defensive ---
    const totalCatches = p.catches.length;
    const totalFaults = p.faults.length;
    const totalDefenses = totalCatches + totalFaults; // times thrown at

    // --- Save difficulty (raw 0–3 scale) ---
    const throwsWithDifficulty = p.throws.filter((t) => t.isHit && t.saveDifficulty !== null);
    const offSaveDifficulty = throwsWithDifficulty.length > 0
      ? throwsWithDifficulty.reduce((s, t) => s + (t.saveDifficulty ?? 0), 0) / throwsWithDifficulty.length
      : null;

    const defThrows = [...p.catches, ...p.faults].filter((t) => t.saveDifficulty !== null);
    const defSaveDifficulty = defThrows.length > 0
      ? defThrows.reduce((s, t) => s + (t.saveDifficulty ?? 0), 0) / defThrows.length
      : null;

    // --- Per-game team context ---
    let teamTotalPoints = 0;
    let totalPointsAgainst = 0;

    for (const game of games) {
      const playerEntry = game.players.find((gp) => gp.playerId === p.id);
      if (!playerEntry) continue;

      const myTeam = playerEntry.team;
      const myTeamIds = new Set(game.players.filter((gp) => gp.team === myTeam).map((gp) => gp.playerId));
      const opposingIds = new Set(game.players.filter((gp) => gp.team !== myTeam).map((gp) => gp.playerId));

      for (const t of game.throws) {
        if (!t.isScored) continue;
        const pts = scoreTypePoints(t.scoreType);
        if (myTeamIds.has(t.throwerId)) teamTotalPoints += pts;
        if (opposingIds.has(t.throwerId)) totalPointsAgainst += pts;
      }
    }

    return {
      id: p.id,
      name: p.name,
      totalThrows,
      hits,
      scores,
      totalPoints,
      tinksAndSinks,
      totalCatches,
      totalFaults,
      totalDefenses,
      plusMinus: scores - totalFaults,
      hitRate: totalThrows > 0 ? hits / totalThrows : null,
      conversionRate: hits > 0 ? scores / hits : null,
      catchRate: totalDefenses > 0 ? totalCatches / totalDefenses : null,
      pointsShareOfTeam: teamTotalPoints > 0 ? totalPoints / teamTotalPoints : null,
      defensiveLiability: totalPointsAgainst > 0 ? totalFaults / totalPointsAgainst : null,
      offSaveDifficulty,
      defSaveDifficulty,
    };
  });

  stats.sort((a, b) => {
    if (b.hitRate !== null && a.hitRate !== null) return b.hitRate - a.hitRate;
    if (b.hitRate !== null) return 1;
    if (a.hitRate !== null) return -1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(stats);
}
