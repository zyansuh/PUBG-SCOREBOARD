import type { MatchHistoryItem } from "@/lib/db";
import { formatSigned } from "@/lib/scoring";
import { DeleteMatchButton } from "./DeleteMatchButton";

export function MatchHistory({ matches }: { matches: MatchHistoryItem[] }) {
  if (matches.length === 0) {
    return <p className="border border-white/10 bg-black/40 px-4 py-12 text-center text-white/70">아직 반영된 매치가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const winner = match.results.find((result) => result.rank === 1);
        return (
          <article key={match.id} className="border border-[#F2A900]/40 bg-black/45">
            <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-black">{formatKoreanDate(match.playedAt)}</h2>
                <p className="text-sm text-white/60">
                  {match.results.length}팀 · 1위 {winner?.teamName ?? "없음"} · 이미지 {match.imageHash.slice(0, 8)}
                </p>
              </div>
              <DeleteMatchButton matchId={match.id} />
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[#F5C518] text-black">
                  <tr>
                    <th className="px-3 py-2 text-center">순위</th>
                    <th className="px-3 py-2 text-left">팀명</th>
                    <th className="px-3 py-2 text-center">킬</th>
                    <th className="px-3 py-2 text-center">순위 점수</th>
                    <th className="px-3 py-2 text-center">킬 점수</th>
                    <th className="px-3 py-2 text-center">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {match.results.map((result) => (
                    <tr key={result.id} className="border-t border-white/10">
                      <td className="px-3 py-2 text-center font-bold">{result.rank}</td>
                      <td className="px-3 py-2">{result.teamName}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{result.kills}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{formatSigned(result.placementPoints)}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{formatSigned(result.killPoints)}</td>
                      <td className="px-3 py-2 text-center font-black text-[#FFD000] tabular-nums">{result.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatKoreanDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
