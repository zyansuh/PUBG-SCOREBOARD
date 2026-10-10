import { Suspense } from "react";
import { LeaderboardData } from "@/components/leaderboard/LeaderboardData";
import { LeaderboardSkeleton } from "@/components/leaderboard/LeaderboardTable";
import { Battlefield } from "@/components/layout/Battlefield";
import { PosterFrame } from "@/components/layout/PosterFrame";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Battlefield />
      <PosterFrame>
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardData />
        </Suspense>
      </PosterFrame>
    </main>
  );
}
