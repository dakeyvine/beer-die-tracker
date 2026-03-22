"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type Player = { id: string; name: string };
type GamePlayer = { team: string; player: Player };
type Throw = {
  id: string;
  throwerId: string;
  isHit: boolean;
  isScored: boolean | null;
  scoreType: string | null;
  catcherId: string | null;
  faultPlayerId: string | null;
  thrower: Player;
  catcher: Player | null;
  faultPlayer: Player | null;
  createdAt: string;
};

type Step =
  | "select-thrower"
  | "hit-or-miss"
  | "scored-or-caught"
  | "score-type"
  | "who-caught"
  | "who-fault";

function scoreTypePoints(scoreType: string | null): number {
  if (scoreType === "tink") return 2;
  if (scoreType === "sink") return 4;
  return 1;
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);

  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
  const [throws, setThrows] = useState<Throw[]>([]);
  const [step, setStep] = useState<Step>("select-thrower");
  const [thrower, setThrower] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);
  const [isScored, setIsScored] = useState<boolean | null>(null);
  const [scoreType, setScoreType] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/games`).then((r) => r.json()).then((games: { id: string; players: GamePlayer[] }[]) => {
      const g = games.find((g) => g.id === gameId);
      if (g) setGamePlayers(g.players);
    });
    fetch(`/api/games/${gameId}/throws`).then((r) => r.json()).then(setThrows);
  }, [gameId]);

  const teamAPlayers = gamePlayers.filter((gp) => gp.team === "A").map((gp) => gp.player);
  const teamBPlayers = gamePlayers.filter((gp) => gp.team === "B").map((gp) => gp.player);
  const allPlayers = gamePlayers.map((gp) => gp.player);

  function playerTeam(playerId: string): "A" | "B" | null {
    const gp = gamePlayers.find((gp) => gp.player.id === playerId);
    return gp ? (gp.team as "A" | "B") : null;
  }

  // Opposing team players (for defense selections)
  const opposingTeamPlayers = thrower
    ? playerTeam(thrower.id) === "A" ? teamBPlayers : teamAPlayers
    : [];

  async function recordThrow(body: object) {
    setSaving(true);
    const res = await fetch(`/api/games/${gameId}/throws`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const t = await res.json();
    setThrows((prev) => [...prev, t]);
    reset();
    setSaving(false);
  }

  function reset() {
    setStep("select-thrower");
    setThrower(null);
    setIsScored(null);
    setScoreType(null);
  }

  async function deleteThrow(throwId: string) {
    await fetch(`/api/games/${gameId}/throws/${throwId}`, { method: "DELETE" });
    setThrows((prev) => prev.filter((t) => t.id !== throwId));
    setConfirmDeleteId(null);
  }

  // Live score: sum points for each team's throws that scored
  const teamAScore = throws
    .filter((t) => t.isScored === true && playerTeam(t.throwerId) === "A")
    .reduce((sum, t) => sum + scoreTypePoints(t.scoreType), 0);
  const teamBScore = throws
    .filter((t) => t.isScored === true && playerTeam(t.throwerId) === "B")
    .reduce((sum, t) => sum + scoreTypePoints(t.scoreType), 0);

  function pct(n: number, d: number) {
    if (d === 0) return "—";
    return `${Math.round((n / d) * 100)}%`;
  }

  const stats = allPlayers.map((p) => {
    const myThrows = throws.filter((t) => t.throwerId === p.id);
    const hits = myThrows.filter((t) => t.isHit).length;
    const scoredThrows = myThrows.filter((t) => t.isScored === true);
    const scores = scoredThrows.length;
    const points = scoredThrows.reduce((sum, t) => sum + scoreTypePoints(t.scoreType), 0);
    const catches = throws.filter((t) => t.catcherId === p.id).length;
    const faults = throws.filter((t) => t.faultPlayerId === p.id).length;
    const team = playerTeam(p.id);
    return { ...p, team, total: myThrows.length, hits, scores, points, catches, faults };
  });

  // Shared button styles
  const bigBtn = "py-5 rounded-2xl font-bold text-xl text-white w-full";
  const backBtn = "text-blue-500 text-base py-2 px-1 font-medium";

  function teamColor(team: "A" | "B" | null) {
    if (team === "A") return "bg-blue-50 border-blue-300 text-blue-800";
    if (team === "B") return "bg-red-50 border-red-300 text-red-800";
    return "bg-gray-50 border-gray-200 text-gray-800";
  }

  return (
    <main className="max-w-lg mx-auto p-4 pb-24">
      {/* Header with score */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-gray-400 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">←</Link>

        {/* Score tracker */}
        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-blue-500 uppercase">Team A</span>
            <span className="text-3xl font-black text-blue-600">{teamAScore}</span>
          </div>
          <span className="text-xl text-gray-300 font-light">vs</span>
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-red-500 uppercase">Team B</span>
            <span className="text-3xl font-black text-red-600">{teamBScore}</span>
          </div>
        </div>

        <span className="text-sm text-gray-400">{throws.length} throws</span>
      </div>

      {/* Throw flowchart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

        {step === "select-thrower" && (
          <>
            <p className="text-sm font-semibold text-gray-500 mb-3">Who&apos;s throwing?</p>
            <div className="mb-2">
              <p className="text-xs text-blue-500 font-semibold uppercase mb-1">Team A</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {teamAPlayers.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { setThrower(p); setStep("hit-or-miss"); }}
                    className="py-4 px-4 bg-blue-50 border border-blue-300 text-blue-800 rounded-2xl font-medium text-base"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-red-500 font-semibold uppercase mb-1">Team B</p>
              <div className="grid grid-cols-2 gap-2">
                {teamBPlayers.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { setThrower(p); setStep("hit-or-miss"); }}
                    className="py-4 px-4 bg-red-50 border border-red-300 text-red-800 rounded-2xl font-medium text-base"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "hit-or-miss" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={reset} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold mr-1 ${playerTeam(thrower!.id) === "A" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                  {playerTeam(thrower!.id) === "A" ? "A" : "B"}
                </span>
                {thrower?.name} — hit or miss?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setStep("scored-or-caught")}
                className={`${bigBtn} bg-green-500`}
              >
                HIT ✅
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ throwerId: thrower!.id, isHit: false, isScored: null })}
                className={`${bigBtn} bg-red-400`}
              >
                MISS ❌
              </button>
            </div>
          </>
        )}

        {step === "scored-or-caught" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setStep("hit-or-miss")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">Hit! Did it score?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setIsScored(true); setStep("score-type"); }}
                className={`${bigBtn} bg-yellow-400`}
              >
                SCORED 🍺
              </button>
              <button
                type="button"
                onClick={() => { setIsScored(false); setStep("who-caught"); }}
                className={`${bigBtn} bg-blue-500`}
              >
                CAUGHT 🤙
              </button>
            </div>
          </>
        )}

        {step === "score-type" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setStep("scored-or-caught")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">What kind of score?</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <button
                type="button"
                onClick={() => { setScoreType("regular"); setStep("who-fault"); }}
                className="py-5 rounded-2xl font-bold text-white bg-yellow-400 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">1</span>
                <span className="text-xs font-semibold">Regular</span>
              </button>
              <button
                type="button"
                onClick={() => { setScoreType("tink"); setStep("who-fault"); }}
                className="py-5 rounded-2xl font-bold text-white bg-orange-500 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">2</span>
                <span className="text-xs font-semibold">Tink</span>
              </button>
              <button
                type="button"
                onClick={() => { setScoreType("sink"); setStep("who-fault"); }}
                className="py-5 rounded-2xl font-bold text-white bg-red-600 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">4</span>
                <span className="text-xs font-semibold">Sink</span>
              </button>
            </div>
          </>
        )}

        {step === "who-caught" && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => setStep("scored-or-caught")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">Who caught it?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {opposingTeamPlayers.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={saving}
                  onClick={() => recordThrow({ throwerId: thrower!.id, isHit: true, isScored, catcherId: p.id })}
                  className={`py-4 px-4 rounded-2xl font-medium text-base border ${teamColor(playerTeam(p.id))}`}
                >
                  {p.name}
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ throwerId: thrower!.id, isHit: true, isScored })}
                className="py-4 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-base col-span-2"
              >
                Unknown / No one
              </button>
            </div>
          </>
        )}

        {step === "who-fault" && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => setStep("score-type")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">Who was at fault?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {opposingTeamPlayers.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={saving}
                  onClick={() => recordThrow({ throwerId: thrower!.id, isHit: true, isScored, scoreType, faultPlayerId: p.id })}
                  className={`py-4 px-4 rounded-2xl font-medium text-base border ${teamColor(playerTeam(p.id))}`}
                >
                  {p.name}
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ throwerId: thrower!.id, isHit: true, isScored, scoreType })}
                className="py-4 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-base col-span-2"
              >
                Unknown / No one
              </button>
            </div>
          </>
        )}
      </div>

      {/* In-game stats */}
      {throws.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Current Game Stats
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left py-2">Player</th>
                  <th className="text-center py-2">Throws</th>
                  <th className="text-center py-2">Hit%</th>
                  <th className="text-center py-2">Score%</th>
                  <th className="text-center py-2">Pts</th>
                  <th className="text-center py-2">Ctch</th>
                  <th className="text-center py-2">Flt</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="py-2 font-medium">
                      <span className={`inline-block w-4 h-4 rounded-full mr-1 align-middle ${s.team === "A" ? "bg-blue-400" : "bg-red-400"}`} />
                      {s.name}
                    </td>
                    <td className="text-center py-2 text-gray-500">{s.total}</td>
                    <td className="text-center py-2">{pct(s.hits, s.total)}</td>
                    <td className="text-center py-2">{pct(s.scores, s.hits)}</td>
                    <td className="text-center py-2 font-semibold">{s.points}</td>
                    <td className="text-center py-2">{s.catches}</td>
                    <td className="text-center py-2">{s.faults}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Throw log */}
      {throws.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Throw Log <span className="text-gray-400 font-normal normal-case">(tap to remove)</span>
          </h2>
          <div className="space-y-1">
            {[...throws].reverse().slice(0, 15).map((t, i) => {
              const team = playerTeam(t.throwerId);
              const isConfirming = confirmDeleteId === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 text-sm rounded-xl px-2 py-2 transition-colors ${
                    isConfirming ? "bg-red-50 border border-red-200" : "border border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(isConfirming ? null : t.id)}
                    className="flex items-center gap-2 flex-1 min-h-0 text-left"
                  >
                    <span className="text-gray-300 w-5 text-right text-xs">{throws.length - i}</span>
                    <span className={`w-4 h-4 rounded-full flex-shrink-0 ${team === "A" ? "bg-blue-400" : "bg-red-400"}`} />
                    <span className="font-medium">{t.thrower.name}</span>
                    {!t.isHit && <span className="text-red-400">miss</span>}
                    {t.isHit && t.isScored && (
                      <span className={t.scoreType === "sink" ? "text-red-600 font-bold" : t.scoreType === "tink" ? "text-orange-500 font-semibold" : "text-yellow-500"}>
                        {t.scoreType === "sink" ? "sink (+4)" : t.scoreType === "tink" ? "tink (+2)" : "scored (+1)"}
                        {t.faultPlayer ? ` — ${t.faultPlayer.name}` : ""}
                      </span>
                    )}
                    {t.isHit && t.isScored === false && (
                      <span className="text-blue-500">
                        caught{t.catcher ? ` by ${t.catcher.name}` : ""}
                      </span>
                    )}
                  </button>
                  {isConfirming ? (
                    <button
                      type="button"
                      onClick={() => deleteThrow(t.id)}
                      className="text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-lg flex-shrink-0"
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="text-gray-200 text-xs flex-shrink-0">✕</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
