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
  const [deleteModal, setDeleteModal] = useState<{ gameId: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch("/api/games").then((r) => r.json()).then(setGames);
  }, []);

  function openDeleteModal(gameId: string) {
    setDeleteModal({ gameId });
    setDeletePassword("");
    setDeleteError("");
  }

  function closeDeleteModal() {
    setDeleteModal(null);
    setDeletePassword("");
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    const res = await fetch(`/api/games/${deleteModal.gameId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (res.ok) {
      setGames((prev) => prev.filter((g) => g.id !== deleteModal.gameId));
      closeDeleteModal();
    } else {
      setDeleteError("Wrong password.");
      setDeletePassword("");
    }
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🎲 Beer Die</h1>
        <div className="flex gap-2">
          <Link
            href="/stats"
            className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium flex items-center justify-center"
          >
            Stats
          </Link>
          <Link
            href="/game/new"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center"
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
            <div
              key={g.id}
              className="flex items-center bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors gap-2"
            >
              <Link href={`/game/${g.id}`} className="flex-1 min-h-0 flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {teamA.join(", ")} <span className="text-gray-400">vs</span>{" "}
                    {teamB.join(", ")}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">
                    {date} · {g._count.throws} throws
                  </div>
                </div>
                <span className="text-gray-300 mr-2">›</span>
              </Link>
              <button
                type="button"
                onClick={() => openDeleteModal(g.id)}
                className="text-gray-300 text-lg px-2"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-1">Delete Game</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the developer password to confirm.</p>
            <input
              type="password"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base mb-2"
              placeholder="Password"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
              onKeyDown={(e) => e.key === "Enter" && confirmDelete()}
            />
            {deleteError && <p className="text-red-500 text-sm mb-2">{deleteError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!deletePassword}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
