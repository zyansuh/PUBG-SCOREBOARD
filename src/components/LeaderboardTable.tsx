import type { RankedStanding } from "@/lib/scoring";
import { formatSigned } from "@/lib/scoring";
import { RankBadge } from "./RankBadge";

export function LeaderboardTable({
  standings,
  matchCount,
  dbError = false,
}: {
  standings: RankedStanding[];
  matchCount: number;
  dbError?: boolean;
}) {
  return (
    <section>
      <h2 className="sr-only">누적 순위</h2>
      <div className="overflow-hidden rounded-[3px] border-[3px] border-[#F2A900] shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
        <div className="hidden md:block">
          <table className="w-full border-collapse text-white">
            <thead>
              <tr className="bg-[#F5C518] text-[15px] font-black tracking-wide text-[#14120c]">
                <th className="w-[16%] px-3 py-3 text-center">순위</th>
                <th className="w-[34%] px-3 py-3 text-center">팀명</th>
                <th className="px-3 py-3 text-center">킬 점수</th>
                <th className="px-3 py-3 text-center">순위 점수</th>
                <th className="w-[16%] px-3 py-3 text-center">총점</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="bg-[#10141b]/95 px-4 py-16 text-center text-white/70">
                    {dbError
                      ? "데이터베이스에 연결하지 못했습니다. 준비 단계를 먼저 실행해 주세요."
                      : "아직 반영된 경기가 없습니다."}
                  </td>
                </tr>
              ) : (
                standings.map((team, index) => (
                  <tr key={team.teamId} className={`border-t border-white/10 ${rowTone(team.rank, index)}`} title={rowTitle(team)}>
                    <td className="px-3 py-2.5">
                      <RankBadge rank={team.rank} idPrefix={`desk-${team.teamId}`} />
                    </td>
                    <td className="px-4 py-2.5 text-left text-[17px] font-bold tracking-wide">{team.teamName}</td>
                    <td className="px-3 py-2.5 text-center text-lg font-bold tabular-nums">{formatSigned(team.killPoints)}</td>
                    <td className="px-3 py-2.5 text-center text-lg font-bold tabular-nums">{formatSigned(team.placementPoints)}</td>
                    <td className={`px-3 py-2.5 text-center font-black tabular-nums text-[#FFD000] ${team.rank === 1 ? "text-[32px]" : "text-[28px]"}`}>
                      {team.totalPoints}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          <div className="bg-[#F5C518] px-4 py-3 text-center text-sm font-black text-[#14120c]">현재 순위</div>
          {standings.length === 0 ? (
            <p className="bg-[#10141b] px-4 py-12 text-center text-sm text-white/70">
              {dbError ? "데이터베이스에 연결하지 못했습니다." : "아직 반영된 경기가 없습니다."}
            </p>
          ) : (
            standings.map((team, index) => (
              <article key={team.teamId} className={`border-t border-white/10 px-4 py-3 ${rowTone(team.rank, index)}`}>
                <div className="flex items-center gap-3">
                  <RankBadge rank={team.rank} idPrefix={`mob-${team.teamId}`} />
                  <h3 className="min-w-0 flex-1 truncate text-base font-bold">{team.teamName}</h3>
                  <p className="text-2xl font-black text-[#FFD000] tabular-nums">{team.totalPoints}</p>
                </div>
                <p className="mt-2 flex gap-4 pl-12 text-sm text-white/80">
                  <span>킬 점수 {formatSigned(team.killPoints)}</span>
                  <span>순위 점수 {formatSigned(team.placementPoints)}</span>
                </p>
              </article>
            ))
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] tracking-wide text-white/55 sm:text-xs">
        {matchCount > 0 ? `${matchCount}경기 누적 · ` : ""}
        동점일 때는 킬 점수, 그다음 1위 횟수 순입니다.
      </p>
    </section>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[3px] border-[3px] border-[#F2A900] bg-black/70">
      <div className="h-12 bg-[#F5C518]" />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="h-14 border-t border-white/5 bg-white/5 motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

function rowTone(rank: number, index: number) {
  if (rank === 1) return "bg-[#3a2e10]/95";
  return index % 2 === 0 ? "bg-[#0e131b]/95" : "bg-[#191e28]/92";
}

function rowTitle(team: RankedStanding) {
  return `${team.teamName}, 총점 ${team.totalPoints}, 1위 ${team.wins}회, ${team.matches}경기`;
}
