"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  playedAt: string;
  players: { team: string; player: { name: string } }[];
  _count: { throws: number };
};

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, []);

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🎲 Beer Die</h1>
        <div className="flex gap-2">
          <Link
            href="/stats"
            className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium"
          >
            Stats
          </Link>
          <Link
            href="/game/new"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            + New Game
          </Link>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Recent Games
      </h2>

      {games.length === 0 && (
        <p className="text-gray-400 text-center py-12">No games yet. Start one!</p>
      )}

      <div className="space-y-2">
        {games.map((g) => {
          const teamA = g.players.filter((p) => p.team === "A").map((p) => p.player.name);
          const teamB = g.players.filter((p) => p.team === "B").map((p) => p.player.name);
          const date = new Date(g.playedAt).toLocaleDateString();
          return (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {teamA.join(", ")} <span className="text-gray-400">vs</span>{" "}
                    {teamB.join(", ")}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {date} · {g._count.throws} throws
                  </div>
                </div>
                <span className="text-gray-300">›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
