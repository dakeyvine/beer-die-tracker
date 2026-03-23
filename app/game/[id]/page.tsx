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
  saveDifficulty: number | null;
  thrower: Player;
  catcher: Player | null;
  faultPlayer: Player | null;
  createdAt: string;
};
type Adjustment = {
  id: string;
  createdAt: string;
  team: string;
  delta: number;
  comment: string;
};

type Step =
  | "select-thrower"
  | "outcome"
  | "who-caught"
  | "who-fault"
  | "save-difficulty";

function scoreTypePoints(scoreType: string | null): number {
  if (scoreType === "tink") return 2;
  if (scoreType === "sink") return 4;
  return 1;
}

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: gameId } = use(params);

  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
  const [throws, setThrows] = useState<Throw[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [step, setStep] = useState<Step>("select-thrower");
  const [thrower, setThrower] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);
  const [isScored, setIsScored] = useState<boolean | null>(null);
  const [scoreType, setScoreType] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingThrowBody, setPendingThrowBody] = useState<object | null>(null);

  // Adjustment modal state
  const [adjModal, setAdjModal] = useState<{ team: "A" | "B" } | null>(null);
  const [adjDelta, setAdjDelta] = useState("");
  const [adjComment, setAdjComment] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/games`).then((r) => r.json()).then((games: { id: string; players: GamePlayer[] }[]) => {
      const g = games.find((g) => g.id === gameId);
      if (g) setGamePlayers(g.players);
    });
    fetch(`/api/games/${gameId}/throws`).then((r) => r.json()).then(setThrows);
    fetch(`/api/games/${gameId}/adjustments`).then((r) => r.json()).then(setAdjustments);
  }, [gameId]);

  const teamAPlayers = gamePlayers.filter((gp) => gp.team === "A").map((gp) => gp.player);
  const teamBPlayers = gamePlayers.filter((gp) => gp.team === "B").map((gp) => gp.player);
  const allPlayers = gamePlayers.map((gp) => gp.player);

  function playerTeam(playerId: string): "A" | "B" | null {
    const gp = gamePlayers.find((gp) => gp.player.id === playerId);
    return gp ? (gp.team as "A" | "B") : null;
  }

  const opposingTeamPlayers = thrower
    ? playerTeam(thrower.id) === "A" ? teamBPlayers : teamAPlayers
    : [];

  async function recordThrow(body: object) {
    setSaving(true);
    try {
      const res = await fetch(`/api/games/${gameId}/throws`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        alert("Error saving throw: " + err);
        return;
      }
      const t = await res.json();
      setThrows((prev) => [...prev, t]);
      reset();
    } catch (e) {
      alert("Network error: " + e);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("select-thrower");
    setThrower(null);
    setIsScored(null);
    setScoreType(null);
    setPendingThrowBody(null);
  }

  function goToSaveDifficulty(body: object) {
    setPendingThrowBody(body);
    setStep("save-difficulty");
  }

  async function deleteThrow(throwId: string) {
    await fetch(`/api/games/${gameId}/throws/${throwId}`, { method: "DELETE" });
    setThrows((prev) => prev.filter((t) => t.id !== throwId));
    setConfirmDeleteId(null);
  }

  async function deleteAdjustment(adjId: string) {
    const res = await fetch(`/api/games/${gameId}/adjustments/${adjId}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Error deleting adjustment: " + await res.text());
      return;
    }
    setAdjustments((prev) => prev.filter((a) => a.id !== adjId));
    setConfirmDeleteId(null);
  }

  function openAdjModal(team: "A" | "B") {
    setAdjModal({ team });
    setAdjDelta("");
    setAdjComment("");
  }

  async function submitAdjustment() {
    if (!adjModal || !adjDelta || !adjComment.trim()) return;
    const delta = parseInt(adjDelta, 10);
    if (isNaN(delta) || delta === 0) return;
    setAdjSaving(true);
    try {
      const res = await fetch(`/api/games/${gameId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: adjModal.team, delta, comment: adjComment.trim() }),
      });
      if (!res.ok) {
        alert("Error saving adjustment: " + await res.text());
        return;
      }
      const adj = await res.json();
      setAdjustments((prev) => [...prev, adj]);
      setAdjModal(null);
    } catch (e) {
      alert("Network error: " + e);
    } finally {
      setAdjSaving(false);
    }
  }

  // Live score
  const teamAThrowScore = throws
    .filter((t) => t.isScored === true && playerTeam(t.throwerId) === "A")
    .reduce((sum, t) => sum + scoreTypePoints(t.scoreType), 0);
  const teamBThrowScore = throws
    .filter((t) => t.isScored === true && playerTeam(t.throwerId) === "B")
    .reduce((sum, t) => sum + scoreTypePoints(t.scoreType), 0);
  const teamAAdjScore = adjustments.filter((a) => a.team === "A").reduce((s, a) => s + a.delta, 0);
  const teamBAdjScore = adjustments.filter((a) => a.team === "B").reduce((s, a) => s + a.delta, 0);
  const teamAScore = teamAThrowScore + teamAAdjScore;
  const teamBScore = teamBThrowScore + teamBAdjScore;

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

  // Merged log: throws + adjustments sorted by createdAt descending
  type LogItem =
    | { kind: "throw"; data: Throw }
    | { kind: "adj"; data: Adjustment };

  const logItems: LogItem[] = [
    ...throws.map((t): LogItem => ({ kind: "throw", data: t })),
    ...adjustments.map((a): LogItem => ({ kind: "adj", data: a })),
  ].sort((a, b) =>
    new Date(b.kind === "throw" ? b.data.createdAt : b.data.createdAt).getTime() -
    new Date(a.kind === "throw" ? a.data.createdAt : a.data.createdAt).getTime()
  ).slice(0, 20);

  const bigBtn = "py-5 rounded-2xl font-bold text-xl text-white w-full";
  const backBtn = "text-blue-500 text-base py-2 px-1 font-medium";

  function teamColor(team: "A" | "B" | null) {
    if (team === "A") return "bg-blue-50 border-blue-300 text-blue-800";
    if (team === "B") return "bg-red-50 border-red-300 text-red-800";
    return "bg-gray-50 border-gray-200 text-gray-800";
  }

  const adjDeltaNum = parseInt(adjDelta, 10);
  const adjValid = adjModal && adjDelta !== "" && !isNaN(adjDeltaNum) && adjDeltaNum !== 0 && adjComment.trim().length > 0;

  return (
    <main className="max-w-lg mx-auto p-4 pb-24">
      {/* Header with score */}
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-gray-400 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">←</Link>

        {/* Score tracker — tap to adjust */}
        <div className="flex-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openAdjModal("A")}
            className="flex flex-col items-center active:opacity-70"
          >
            <span className="text-3xl font-black text-blue-600">{teamAScore}</span>
          </button>
          <span className="text-xl text-gray-300 font-light">vs</span>
          <button
            type="button"
            onClick={() => openAdjModal("B")}
            className="flex flex-col items-center active:opacity-70"
          >
            <span className="text-3xl font-black text-red-600">{teamBScore}</span>
          </button>
        </div>

        <span className="text-sm text-gray-400">{throws.length} throws</span>
      </div>

      {/* Throw flowchart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

        {step === "select-thrower" && (
          <>
            <p className="text-sm font-semibold text-gray-500 mb-3">Who&apos;s throwing?</p>
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {teamAPlayers.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { setThrower(p); setStep("outcome"); }}
                    className="py-4 px-4 bg-blue-50 border border-blue-300 text-blue-800 rounded-2xl font-medium text-base"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {teamBPlayers.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => { setThrower(p); setStep("outcome"); }}
                    className="py-4 px-4 bg-red-50 border border-red-300 text-red-800 rounded-2xl font-medium text-base"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === "outcome" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={reset} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${playerTeam(thrower!.id) === "A" ? "bg-blue-400" : "bg-red-400"}`} />
                {thrower?.name} — what happened?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ throwerId: thrower!.id, isHit: false, isScored: null })}
                className="py-5 rounded-2xl font-bold text-white bg-red-400 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">❌</span>
                <span className="text-sm font-semibold">Miss</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsScored(true); setScoreType("regular"); setStep("who-fault"); }}
                className="py-5 rounded-2xl font-bold text-white bg-green-400 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">🍺</span>
                <span className="text-sm font-semibold">Hit +1</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ throwerId: thrower!.id, isHit: true, isScored: false })}
                className="py-5 rounded-2xl font-bold text-white bg-gray-400 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">⬇️</span>
                <span className="text-sm font-semibold">Table</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsScored(true); setScoreType("tink"); setStep("who-fault"); }}
                className="py-5 rounded-2xl font-bold text-white bg-orange-500 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">💥</span>
                <span className="text-sm font-semibold">Tink +2</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsScored(false); setStep("who-caught"); }}
                className="py-5 rounded-2xl font-bold text-white bg-blue-500 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">🤙</span>
                <span className="text-sm font-semibold">Caught</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ throwerId: thrower!.id, isHit: true, isScored: true, scoreType: "sink", saveDifficulty: 3 })}
                className="py-5 rounded-2xl font-bold text-white bg-purple-600 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">🌊</span>
                <span className="text-sm font-semibold">Sink +4</span>
              </button>
            </div>
          </>
        )}

        {step === "who-caught" && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => setStep("outcome")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">Who caught it?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {opposingTeamPlayers.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={saving}
                  onClick={() => goToSaveDifficulty({ throwerId: thrower!.id, isHit: true, isScored, catcherId: p.id })}
                  className={`py-4 px-4 rounded-2xl font-medium text-base border ${teamColor(playerTeam(p.id))}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "who-fault" && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => setStep("outcome")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">Who was at fault?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {opposingTeamPlayers.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={saving}
                  onClick={() => goToSaveDifficulty({ throwerId: thrower!.id, isHit: true, isScored, scoreType, faultPlayerId: p.id })}
                  className={`py-4 px-4 rounded-2xl font-medium text-base border ${teamColor(playerTeam(p.id))}`}
                >
                  {p.name}
                </button>
              ))}
              <button
                type="button"
                disabled={saving}
                onClick={() => goToSaveDifficulty({ throwerId: thrower!.id, isHit: true, isScored, scoreType, sharedFault: true })}
                className="py-4 px-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-base col-span-2"
              >
                Both / Unknown
              </button>
            </div>
          </>
        )}

        {step === "save-difficulty" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setStep(isScored === false ? "who-caught" : "who-fault")} className={backBtn}>← back</button>
              <p className="text-sm font-semibold text-gray-700">How hard was the save?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ ...pendingThrowBody, saveDifficulty: 1 })}
                className="py-5 rounded-2xl font-bold text-white bg-green-500 flex flex-col items-center gap-1"
              >
                <span className="text-xl">Easy</span>
                <span className="text-xs font-semibold opacity-80">Routine play</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ ...pendingThrowBody, saveDifficulty: 2 })}
                className="py-5 rounded-2xl font-bold text-white bg-amber-400 flex flex-col items-center gap-1"
              >
                <span className="text-xl">Medium</span>
                <span className="text-xs font-semibold opacity-80">Had to work for it</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => recordThrow({ ...pendingThrowBody, saveDifficulty: 3 })}
                className="py-5 rounded-2xl font-bold text-white bg-red-500 flex flex-col items-center gap-1"
              >
                <span className="text-xl">Hard</span>
                <span className="text-xs font-semibold opacity-80">Exceptional toss</span>
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

      {/* Throw + adjustment log */}
      {logItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Log <span className="text-gray-400 font-normal normal-case">(tap throw to remove)</span>
          </h2>
          <div className="space-y-1">
            {logItems.map((item, i) => {
              if (item.kind === "adj") {
                const a = item.data;
                const teamCls = a.team === "A" ? "bg-blue-400" : "bg-red-400";
                const deltaTxt = a.delta > 0 ? `+${a.delta}` : `${a.delta}`;
                const isConfirmingAdj = confirmDeleteId === `adj-${a.id}`;
                return (
                  <div key={`adj-${a.id}`} className={`flex items-center gap-2 text-sm rounded-xl px-2 py-2 transition-colors ${isConfirmingAdj ? "bg-red-50 border border-red-200" : "bg-purple-50 border border-purple-200"}`}>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(isConfirmingAdj ? null : `adj-${a.id}`)}
                      className="flex items-center gap-2 flex-1 min-h-0 text-left"
                    >
                      <span className="text-gray-300 w-5 text-right text-xs">—</span>
                      <span className={`w-4 h-4 rounded-full flex-shrink-0 ${teamCls}`} />
                      <span className="font-semibold text-purple-700">{deltaTxt}</span>
                      <span className="text-purple-500 text-xs truncate">— {a.comment}</span>
                    </button>
                    {isConfirmingAdj ? (
                      <button
                        type="button"
                        onClick={() => deleteAdjustment(a.id)}
                        className="text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-lg flex-shrink-0"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-purple-200 text-xs flex-shrink-0">✕</span>
                    )}
                  </div>
                );
              }
              const t = item.data as Throw;
              const team = playerTeam(t.throwerId);
              const isConfirming = confirmDeleteId === t.id;
              // find sequential index among throws only
              const throwIndex = throws.findIndex((th) => th.id === t.id);
              return (
                <div
                  key={`throw-${t.id}`}
                  className={`flex items-center gap-2 text-sm rounded-xl px-2 py-2 transition-colors ${
                    isConfirming ? "bg-red-50 border border-red-200" : "border border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(isConfirming ? null : t.id)}
                    className="flex items-center gap-2 flex-1 min-h-0 text-left"
                  >
                    <span className="text-gray-300 w-5 text-right text-xs">{throwIndex + 1}</span>
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

      {/* Score adjustment modal */}
      {adjModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-1">Adjust Score</h2>
            <p className="text-sm text-gray-500 mb-4">Custom ruleset correction</p>

            {/* Team toggle */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium mb-4">
              <button
                type="button"
                onClick={() => setAdjModal({ team: "A" })}
                className={`flex-1 py-2.5 ${adjModal.team === "A" ? "bg-blue-500 text-white" : "bg-white text-gray-500"}`}
              >
                <span className="inline-block w-3 h-3 rounded-full bg-current opacity-80 mr-1.5 align-middle" style={{ background: adjModal.team === "A" ? "white" : "#60a5fa" }} />
                Blue
              </button>
              <button
                type="button"
                onClick={() => setAdjModal({ team: "B" })}
                className={`flex-1 py-2.5 ${adjModal.team === "B" ? "bg-red-500 text-white" : "bg-white text-gray-500"}`}
              >
                <span className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle" style={{ background: adjModal.team === "B" ? "white" : "#f87171" }} />
                Red
              </button>
            </div>

            {/* Delta input */}
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Points (use − for deduction)
            </label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base mb-3"
              placeholder="e.g. +2 or -1"
              value={adjDelta}
              onChange={(e) => setAdjDelta(e.target.value)}
              autoFocus
            />

            {/* Comment */}
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Reason (required)
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
              placeholder="e.g. penalty kick, missed zone..."
              value={adjComment}
              onChange={(e) => setAdjComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adjValid && submitAdjustment()}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjModal(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdjustment}
                disabled={!adjValid || adjSaving}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold disabled:opacity-40"
              >
                {adjSaving ? "Saving…" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
