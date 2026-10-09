import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { aggregateStandings, scoreTeam } from "../src/lib/scoring";

const prisma = new PrismaClient();

const TEAMS = ["Team OPSN", "치킨은사랑입니다", "배그는즐거워", "TEAM_불꽃", "바다의신", "일단살자", "감자튀김단", "무지성돌격대"];

const MATCHES: { playedAt: string; order: number[]; kills: number[] }[] = [
  { playedAt: "2026-09-06T11:00:00+09:00", order: [0, 1, 2, 3, 4, 5, 6, 7], kills: [8, 5, 4, 3, 2, 1, 1, 0] },
  { playedAt: "2026-09-13T11:00:00+09:00", order: [0, 2, 1, 4, 3, 6, 5, 7], kills: [7, 4, 6, 2, 3, 1, 2, 1] },
  { playedAt: "2026-09-20T11:00:00+09:00", order: [1, 0, 3, 2, 5, 4, 7, 6], kills: [6, 9, 3, 5, 2, 2, 0, 1] },
  { playedAt: "2026-09-27T11:00:00+09:00", order: [0, 1, 4, 2, 3, 7, 5, 6], kills: [6, 4, 3, 4, 2, 1, 2, 2] },
  { playedAt: "2026-10-04T11:00:00+09:00", order: [2, 0, 1, 5, 3, 4, 6, 7], kills: [5, 7, 6, 1, 3, 2, 1, 0] },
];

function hash(label: string) {
  return createHash("sha256").update(label).digest("hex");
}

async function main() {
  const existing = await prisma.match.count();
  if (existing > 0 && process.env.SEED_RESET !== "1") {
    console.log("이미 경기 데이터가 있어 시드를 건너뜁니다. 샘플로 되돌리려면 SEED_RESET=1 npm run db:seed");
    return;
  }

  await prisma.matchResult.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();

  const teams = [];
  for (const name of TEAMS) {
    teams.push(await prisma.team.create({ data: { name } }));
  }

  const flat = [];
  for (const [index, sample] of MATCHES.entries()) {
    const match = await prisma.match.create({
      data: {
        imageHash: hash(`opsn-seed-${index + 1}`),
        playedAt: new Date(sample.playedAt),
      },
    });

    for (let place = 0; place < sample.order.length; place += 1) {
      const rank = place + 1;
      const kills = sample.kills[place];
      const team = teams[sample.order[place]];
      const scored = scoreTeam(rank, kills);
      await prisma.matchResult.create({
        data: {
          matchId: match.id,
          teamId: team.id,
          rank,
          kills,
          ...scored,
        },
      });
      flat.push({ teamId: team.id, teamName: team.name, rank, kills });
    }
  }

  const standings = aggregateStandings(flat);
  console.log(`샘플 매치 ${MATCHES.length}개를 넣었습니다.`);
  for (const row of standings) {
    console.log(`${row.rank}. ${row.teamName}  킬 +${row.killPoints}  순위 +${row.placementPoints}  총점 ${row.totalPoints}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
