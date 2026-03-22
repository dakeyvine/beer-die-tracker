"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Player = { id: string; name: string };
type RosterEntry = { player: Player; team: "A" | "B" | null };

export default function NewGame() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/players").then((r) => r.json()).then(setAllPlayers);
  }, []);

  const rosterIds = new Set(roster.map((r) => r.player.id));

  const searchResults = search.trim()
    ? allPlayers.filter(
        (p) =>
          !rosterIds.has(p.id) &&
          p.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function addToRoster(player: Player) {
    setRoster((prev) => [...prev, { player, team: null }]);
    setSearch("");
    searchRef.current?.focus();
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const player = await res.json();
    setAllPlayers((prev) => [...prev, player]);
    setRoster((prev) => [...prev, { player, team: null }]);
    setNewName("");
  }

  function setTeam(playerId: string, team: "A" | "B") {
    setRoster((prev) =>
      prev.map((r) =>
        r.player.id === playerId
          ? { ...r, team: r.team === team ? null : team }
          : r
      )
    );
  }

  function removeFromRoster(playerId: string) {
    setRoster((prev) => prev.filter((r) => r.player.id !== playerId));
  }

  async function startGame() {
    const teamA = roster.filter((r) => r.team === "A").map((r) => r.player.id);
    const teamB = roster.filter((r) => r.team === "B").map((r) => r.player.id);
    if (!teamA.length || !teamB.length) return;
    setLoading(true);
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamA, teamB }),
    });
    const game = await res.json();
    router.push(`/game/${game.id}`);
  }

  const teamA = roster.filter((r) => r.team === "A");
  const teamB = roster.filter((r) => r.team === "B");
  const canStart = teamA.length > 0 && teamB.length > 0;

  function teamBadge(team: "A" | "B" | null, targetTeam: "A" | "B") {
    const active = team === targetTeam;
    if (targetTeam === "A") return active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400";
    return active ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400";
  }

  return (
    <main className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-400 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">New Game</h1>
      </div>

      {/* Search existing players */}
      <div className="mb-4 relative">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Search players
        </p>
        <input
          ref={searchRef}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base"
          placeholder="Type to search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg z-10 overflow-hidden">
            {searchResults.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => addToRoster(p)}
                className="w-full text-left px-4 py-3 text-base font-medium border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {search.trim() && searchResults.length === 0 && (
          <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg z-10 px-4 py-3 text-sm text-gray-400">
            No existing players found
          </div>
        )}
      </div>

      {/* Create new player */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          New player
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base"
            placeholder="Enter name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={createAndAdd}
            disabled={!newName.trim()}
            className="px-5 min-h-[48px] bg-gray-800 text-white rounded-xl text-base font-medium disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>

      {/* Game roster */}
      {roster.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Game roster — assign teams
          </p>
          <div className="space-y-2">
            {roster.map(({ player, team }) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 border rounded-2xl px-4 py-3 transition-colors ${
                  team === "A" ? "bg-blue-50 border-blue-300" :
                  team === "B" ? "bg-red-50 border-red-300" :
                  "bg-white border-gray-200"
                }`}
              >
                <span className="flex-1 font-medium">{player.name}</span>
                <button
                  type="button"
                  onClick={() => setTeam(player.id, "A")}
                  className={`w-11 h-11 rounded-full text-sm font-bold transition-colors ${teamBadge(team, "A")}`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setTeam(player.id, "B")}
                  className={`w-11 h-11 rounded-full text-sm font-bold transition-colors ${teamBadge(team, "B")}`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => removeFromRoster(player.id)}
                  className="w-11 h-11 flex items-center justify-center text-gray-300 text-xl"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team summary */}
      {(teamA.length > 0 || teamB.length > 0) && (
        <div className="flex gap-4 mb-6 text-sm">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="font-semibold text-blue-700 mb-1">Team A</div>
            {teamA.map(({ player }) => (
              <div key={player.id} className="text-blue-600">{player.name}</div>
            ))}
            {teamA.length === 0 && <div className="text-blue-300 text-xs">No players yet</div>}
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="font-semibold text-red-700 mb-1">Team B</div>
            {teamB.map(({ player }) => (
              <div key={player.id} className="text-red-600">{player.name}</div>
            ))}
            {teamB.length === 0 && <div className="text-red-300 text-xs">No players yet</div>}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={startGame}
        disabled={!canStart || loading}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-base disabled:opacity-40"
      >
        {loading ? "Starting..." : "Start Game"}
      </button>
    </main>
  );
}
