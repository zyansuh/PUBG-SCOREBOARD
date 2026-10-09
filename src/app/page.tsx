import { Suspense } from "react";
import { Battlefield } from "@/components/Battlefield";
import { LeaderboardData } from "@/components/LeaderboardData";
import { LeaderboardSkeleton } from "@/components/LeaderboardTable";
import { PosterFrame } from "@/components/PosterFrame";

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
