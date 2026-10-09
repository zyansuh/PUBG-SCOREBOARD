import { connection } from "next/server";
import { getLeaderboard } from "@/lib/db";
import type { RankedStanding } from "@/lib/scoring";
import { LeaderboardTable } from "./LeaderboardTable";

export async function LeaderboardData() {
  await connection();
  let standings: RankedStanding[] = [];
  let matchCount = 0;
  let dbError = false;

  try {
    const data = await getLeaderboard();
    standings = data.standings;
    matchCount = data.matchCount;
  } catch (error) {
    console.error("leaderboard failed", error instanceof Error ? error.message : "unknown");
    dbError = true;
  }

  return <LeaderboardTable standings={standings} matchCount={matchCount} dbError={dbError} />;
}
