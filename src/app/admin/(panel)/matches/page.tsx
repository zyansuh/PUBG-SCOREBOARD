import { connection } from "next/server";
import { MatchHistory } from "@/components/match/MatchHistory";
import { listMatches, type MatchHistoryItem } from "@/lib/db";

export default async function MatchesPage() {
  await connection();
  let matches: MatchHistoryItem[] | null = null;
  try {
    matches = await listMatches();
  } catch (error) {
    console.error("matches failed", error instanceof Error ? error.message : "unknown");
  }

  if (!matches) {
    return <p className="text-red-200">매치 기록을 불러오지 못했습니다. 데이터베이스 준비를 확인해 주세요.</p>;
  }

  return (
    <section>
      <h1 className="text-2xl font-black">매치 기록</h1>
      <p className="mt-2 mb-5 text-sm text-white/70">잘못 반영된 매치를 삭제하면 누적 순위는 남은 결과만으로 다시 계산됩니다.</p>
      <MatchHistory matches={matches} />
    </section>
  );
}
