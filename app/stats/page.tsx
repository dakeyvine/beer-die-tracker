"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type PlayerStats = {
  id: string;
  name: string;
  totalThrows: number;
  hits: number;
  scores: number;
  totalPoints: number;
  tinksAndSinks: number;
  totalCatches: number;
  totalFaults: number;
  totalDefenses: number;
  plusMinus: number;
  hitRate: number | null;
  conversionRate: number | null;
  catchRate: number | null;
  pointsShareOfTeam: number | null;
  defensiveLiability: number | null;
  offSaveDifficulty: number | null;
  defSaveDifficulty: number | null;
};

type Mode = "best" | "worst";

function computeRanks(
  players: PlayerStats[],
  getValue: (p: PlayerStats) => number | null,
  higherIsBetter: boolean,
  mode: Mode
): Map<string, 1 | 2 | 3> {
  const map = new Map<string, 1 | 2 | 3>();
  const valid = players
    .filter((p) => getValue(p) !== null)
    .map((p) => ({ id: p.id, val: getValue(p)! }));
  if (valid.length < 2) return map;

  const bestFirst = mode === "best" ? higherIsBetter : !higherIsBetter;
  const sorted = [...valid].sort((a, b) => bestFirst ? b.val - a.val : a.val - b.val);

  let rank = 0, prev: number | null = null;
  for (const { id, val } of sorted) {
    if (val !== prev) rank++;
    if (rank > 3) break;
    map.set(id, rank as 1 | 2 | 3);
    prev = val;
  }
  return map;
}

function Medal({ rank, mode }: { rank: 1 | 2 | 3 | undefined; mode: Mode }) {
  if (!rank) return null;
  const best: Record<number, string> = {
    1: "bg-yellow-400 text-yellow-900",
    2: "bg-gray-300 text-gray-700",
    3: "bg-orange-300 text-orange-900",
  };
  const worst: Record<number, string> = {
    1: "bg-red-500 text-white",
    2: "bg-red-300 text-red-900",
    3: "bg-red-100 text-red-600",
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-black ml-1 flex-shrink-0 ${mode === "best" ? best[rank] : worst[rank]}`}>
      {rank}
    </span>
  );
}

function pct(n: number | null) {
  if (n === null) return "—";
  return `${Math.round(n * 100)}%`;
}

function saveDiffFmt(n: number | null) {
  if (n === null) return "—";
  return Math.round((n / 3) * 100).toString();
}

function pmFmt(n: number) {
  if (n > 0) return { text: `+${n}`, cls: "text-green-600 font-semibold" };
  if (n < 0) return { text: `${n}`, cls: "text-red-500 font-semibold" };
  return { text: "0", cls: "text-gray-400" };
}

function PlayerFilter({
  players,
  selectedIds,
  onChange,
}: {
  players: PlayerStats[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = selectedIds.size === players.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(players.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  }

  const label = allSelected ? "All Players" : selectedIds.size === 0 ? "No Players" : `${selectedIds.size} of ${players.length}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-white"
      >
        {label} <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 min-w-[180px] overflow-hidden">
          <button
            type="button"
            onClick={toggleAll}
            className="w-full text-left px-4 py-3 text-sm font-semibold border-b border-gray-100 hover:bg-gray-50"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          {players.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => toggleOne(p.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50"
            >
              <span className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${selectedIds.has(p.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                {selectedIds.has(p.id) && <span className="text-white text-xs font-black">✓</span>}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("best");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: PlayerStats[]) => {
        setStats(data);
        setSelectedIds(new Set(data.map((s) => s.id)));
      });
  }, []);

  const displayed = stats.filter((s) => selectedIds.has(s.id));

  const ranks = {
    totalThrows:        computeRanks(displayed, (p) => p.totalThrows, true, mode),
    hits:               computeRanks(displayed, (p) => p.hits, true, mode),
    totalDefenses:      computeRanks(displayed, (p) => p.totalDefenses, true, mode),
    hitRate:            computeRanks(displayed, (p) => p.hitRate, true, mode),
    conversionRate:     computeRanks(displayed, (p) => p.conversionRate, true, mode),
    totalPoints:        computeRanks(displayed, (p) => p.totalPoints, true, mode),
    pointsShareOfTeam:  computeRanks(displayed, (p) => p.pointsShareOfTeam, true, mode),
    plusMinus:          computeRanks(displayed, (p) => p.plusMinus, true, mode),
    totalCatches:       computeRanks(displayed, (p) => p.totalCatches, true, mode),
    totalFaults:        computeRanks(displayed, (p) => p.totalFaults, false, mode),
    catchRate:          computeRanks(displayed, (p) => p.catchRate, true, mode),
    defensiveLiability: computeRanks(displayed, (p) => p.defensiveLiability, false, mode),
    offSaveDifficulty:  computeRanks(displayed, (p) => p.offSaveDifficulty, true, mode),
    defSaveDifficulty:  computeRanks(displayed, (p) => p.defSaveDifficulty, true, mode),
  };

  const medalStyles = mode === "best"
    ? [
        { cls: "bg-yellow-400 text-yellow-900", label: "1st best" },
        { cls: "bg-gray-300 text-gray-700",     label: "2nd best" },
        { cls: "bg-orange-300 text-orange-900", label: "3rd best" },
      ]
    : [
        { cls: "bg-red-500 text-white",         label: "1st worst" },
        { cls: "bg-red-300 text-red-900",       label: "2nd worst" },
        { cls: "bg-red-100 text-red-600",       label: "3rd worst" },
      ];

  return (
    <main className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/" className="text-gray-400 text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">←</Link>
        <h1 className="text-xl font-bold flex-1">All-Time Stats</h1>
        {stats.length > 0 && (
          <PlayerFilter players={stats} selectedIds={selectedIds} onChange={setSelectedIds} />
        )}
      </div>

      {/* Mode toggle + legend */}
      {displayed.length > 1 && (
        <div className="flex items-center gap-4 mb-5">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("best")}
              className={`px-4 py-2 ${mode === "best" ? "bg-gray-800 text-white" : "bg-white text-gray-500"}`}
            >
              Best
            </button>
            <button
              type="button"
              onClick={() => setMode("worst")}
              className={`px-4 py-2 ${mode === "worst" ? "bg-gray-800 text-white" : "bg-white text-gray-500"}`}
            >
              Worst
            </button>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            {medalStyles.map(({ cls, label }, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-xs ${cls}`}>{i + 1}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {displayed.length === 0 && (
        <p className="text-gray-400 text-center py-16">
          {stats.length === 0 ? "No data yet. Play some games!" : "No players selected."}
        </p>
      )}

      {displayed.length > 0 && (
        <>
          {/* Offense: counting stats left, percentages right */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Offense</h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-200">
                  <th className="text-left py-2 pr-3">Player</th>
                  <th className="text-center py-2 px-2 text-gray-300">Tosses</th>
                  <th className="text-center py-2 px-2 text-gray-300">Hits</th>
                  <th className="text-center py-2 px-2">Pts</th>
                  <th className="text-center py-2 px-2">+/-</th>
                  <th className="text-center py-2 px-2">Save Diff</th>
                  <th className="text-center py-2 px-2">Hit %</th>
                  <th className="text-center py-2 px-2">Conv %</th>
                  <th className="text-center py-2 px-2">Team Pts %</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((s) => {
                  const pm = pmFmt(s.plusMinus);
                  return (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-3 pr-3 font-semibold">{s.name}</td>
                      <td className="text-center py-3 px-2 text-gray-400">
                        <span className="inline-flex items-center justify-center">
                          {s.totalThrows}<Medal rank={ranks.totalThrows.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2 text-gray-400">
                        <span className="inline-flex items-center justify-center">
                          {s.hits}<Medal rank={ranks.hits.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2 font-semibold">
                        <span className="inline-flex items-center justify-center">
                          {s.totalPoints}<Medal rank={ranks.totalPoints.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className={`inline-flex items-center justify-center ${pm.cls}`}>
                          {pm.text}<Medal rank={ranks.plusMinus.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {saveDiffFmt(s.offSaveDifficulty)}<Medal rank={ranks.offSaveDifficulty.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {pct(s.hitRate)}<Medal rank={ranks.hitRate.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {pct(s.conversionRate)}<Medal rank={ranks.conversionRate.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {pct(s.pointsShareOfTeam)}<Medal rank={ranks.pointsShareOfTeam.get(s.id)} mode={mode} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Defense: counting stats left, percentages right */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Defense</h2>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-200">
                  <th className="text-left py-2 pr-3">Player</th>
                  <th className="text-center py-2 px-2 text-gray-300">Defenses</th>
                  <th className="text-center py-2 px-2">Catches</th>
                  <th className="text-center py-2 px-2">Faults</th>
                  <th className="text-center py-2 px-2">Save Diff</th>
                  <th className="text-center py-2 px-2">Catch %</th>
                  <th className="text-center py-2 px-2">Liability %</th>
                </tr>
              </thead>
              <tbody>
                {[...displayed]
                  .sort((a, b) => (b.catchRate ?? -1) - (a.catchRate ?? -1))
                  .map((s) => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-3 pr-3 font-semibold">{s.name}</td>
                      <td className="text-center py-3 px-2 text-gray-400">
                        <span className="inline-flex items-center justify-center">
                          {s.totalDefenses}<Medal rank={ranks.totalDefenses.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {s.totalCatches}<Medal rank={ranks.totalCatches.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {s.totalFaults}<Medal rank={ranks.totalFaults.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {saveDiffFmt(s.defSaveDifficulty)}<Medal rank={ranks.defSaveDifficulty.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {pct(s.catchRate)}<Medal rank={ranks.catchRate.get(s.id)} mode={mode} />
                        </span>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className="inline-flex items-center justify-center">
                          {pct(s.defensiveLiability)}<Medal rank={ranks.defensiveLiability.get(s.id)} mode={mode} />
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Player cards */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Player Cards</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {displayed.map((s) => {
              const pm = pmFmt(s.plusMinus);
              return (
                <div key={s.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                  <div className="font-bold text-lg mb-3">{s.name}</div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    {[
                      { label: "Hit %",    val: pct(s.hitRate),         rank: ranks.hitRate.get(s.id) },
                      { label: "Conv %",   val: pct(s.conversionRate),  rank: ranks.conversionRate.get(s.id) },
                      { label: "Catch %",  val: pct(s.catchRate),       rank: ranks.catchRate.get(s.id) },
                    ].map(({ label, val, rank }) => (
                      <div key={label}>
                        <div className="text-xl font-bold flex items-center justify-center">
                          {val}<Medal rank={rank} mode={mode} />
                        </div>
                        <div className="text-xs text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-3">
                    <div>
                      <div className="text-xl font-bold flex items-center justify-center">
                        {pct(s.pointsShareOfTeam)}<Medal rank={ranks.pointsShareOfTeam.get(s.id)} mode={mode} />
                      </div>
                      <div className="text-xs text-gray-400">Team Pts %</div>
                    </div>
                    <div>
                      <div className={`text-xl font-bold flex items-center justify-center ${pm.cls}`}>
                        {pm.text}<Medal rank={ranks.plusMinus.get(s.id)} mode={mode} />
                      </div>
                      <div className="text-xs text-gray-400">+/-</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold flex items-center justify-center">
                        {pct(s.defensiveLiability)}<Medal rank={ranks.defensiveLiability.get(s.id)} mode={mode} />
                      </div>
                      <div className="text-xs text-gray-400">Liability %</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    {s.totalThrows} tosses · {s.totalPoints} pts · {s.tinksAndSinks} tinks/sinks
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
