import "server-only";
import { Prisma } from "@prisma/client";
import type { RankedStanding } from "./scoring";
import { aggregateStandings, scoreTeam } from "./scoring";
import { normalizeTeamName, ROSTER_SIZE, type RosterEntry, type TeamOption } from "./teams";
import { prisma } from "./prisma";

export class DuplicateMatchError extends Error {
  constructor() {
    super("이미 반영된 스크린샷입니다. 같은 이미지는 한 번만 등록할 수 있습니다.");
    this.name = "DuplicateMatchError";
  }
}

export class DuplicateTeamNameError extends Error {
  constructor() {
    super("이미 같은 이름의 팀이 있습니다. 기존 팀과 합쳐 주세요.");
    this.name = "DuplicateTeamNameError";
  }
}

export class TeamNotFoundError extends Error {
  constructor() {
    super("선택한 팀을 찾을 수 없습니다.");
    this.name = "TeamNotFoundError";
  }
}

export class RosterSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterSaveError";
  }
}

export type RosterSlot = {
  slot: number;
  id: string | null;
  name: string;
};

export type RosterForm = {
  persisted: boolean;
  slots: RosterSlot[];
};

export type NewMatchInput = {
  imageHash: string;
  playedAt: Date;
  teams: Array<{
    name: string;
    rank: number;
    kills: number;
    teamId: string | null;
  }>;
};

export type MatchHistoryItem = {
  id: string;
  playedAt: string;
  imageHash: string;
  results: Array<{
    id: string;
    rank: number;
    teamName: string;
    kills: number;
    placementPoints: number;
    killPoints: number;
    totalPoints: number;
  }>;
};

export async function getLeaderboard(): Promise<{ standings: RankedStanding[]; matchCount: number }> {
  const [matchCount, results] = await Promise.all([
    prisma.match.count(),
    prisma.matchResult.findMany({
      select: {
        teamId: true,
        rank: true,
        kills: true,
        team: { select: { name: true } },
      },
    }),
  ]);

  return {
    matchCount,
    standings: aggregateStandings(
      results.map((result) => ({
        teamId: result.teamId,
        teamName: result.team.name,
        rank: result.rank,
        kills: result.kills,
      })),
    ),
  };
}

function emptyRosterSlots(): RosterSlot[] {
  return Array.from({ length: ROSTER_SIZE }, (_, index) => ({
    slot: index + 1,
    id: null,
    name: "",
  }));
}

export async function getRosterForm(): Promise<RosterForm> {
  const slotted = await prisma.team.findMany({
    where: { slot: { not: null } },
    orderBy: { slot: "asc" },
    select: { id: true, name: true, slot: true },
  });
  const slots = emptyRosterSlots();

  if (slotted.length > 0) {
    for (const team of slotted) {
      if (!team.slot || team.slot < 1 || team.slot > ROSTER_SIZE) continue;
      slots[team.slot - 1] = { slot: team.slot, id: team.id, name: team.name };
    }
    return { persisted: true, slots };
  }

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
    take: ROSTER_SIZE,
    select: { id: true, name: true },
  });
  teams.forEach((team, index) => {
    slots[index] = { slot: index + 1, id: team.id, name: team.name };
  });
  return { persisted: false, slots };
}

export async function listSlottedTeams(): Promise<TeamOption[]> {
  return prisma.team.findMany({
    where: { slot: { not: null } },
    orderBy: { slot: "asc" },
    select: { id: true, name: true },
  });
}

export async function saveRoster(entries: RosterEntry[]): Promise<RosterForm> {
  await prisma.$transaction(async (tx) => {
    await tx.team.updateMany({ data: { slot: null } });

    const named = entries.map((entry, index) => ({ ...entry, slot: index + 1 })).filter((entry) => entry.name.length > 0);

    for (const entry of named) {
      if (!entry.id) continue;
      try {
        await tx.team.update({
          where: { id: entry.id },
          data: { name: entry.name, slot: entry.slot },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          throw new RosterSaveError("선택한 팀을 찾을 수 없습니다.");
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new RosterSaveError("이미 같은 이름의 팀이 있습니다.");
        }
        throw error;
      }
    }

    const current = await tx.team.findMany({ select: { id: true, name: true, slot: true } });
    for (const entry of named) {
      if (entry.id) continue;
      const match = current.find(
        (team) => team.slot === null && normalizeTeamName(team.name) === normalizeTeamName(entry.name),
      );
      if (match) {
        await tx.team.update({
          where: { id: match.id },
          data: { name: entry.name, slot: entry.slot },
        });
        match.slot = entry.slot;
        match.name = entry.name;
        continue;
      }
      try {
        const created = await tx.team.create({ data: { name: entry.name, slot: entry.slot } });
        current.push({ id: created.id, name: created.name, slot: entry.slot });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new RosterSaveError("이미 같은 이름의 팀이 있습니다.");
        }
        throw error;
      }
    }
  });

  return getRosterForm();
}

export async function listTeamOptions(): Promise<TeamOption[]> {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return teams;
}

export async function findMatchByHash(imageHash: string) {
  return prisma.match.findUnique({
    where: { imageHash },
    select: { id: true },
  });
}

export async function createMatch(input: NewMatchInput) {
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.match.findUnique({
      where: { imageHash: input.imageHash },
      select: { id: true },
    });
    if (duplicate) throw new DuplicateMatchError();

    let match;
    try {
      match = await tx.match.create({
        data: {
          imageHash: input.imageHash,
          playedAt: input.playedAt,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new DuplicateMatchError();
      }
      throw error;
    }

    for (const team of input.teams) {
      const scored = scoreTeam(team.rank, team.kills);
      let teamId = team.teamId;

      if (teamId) {
        const existing = await tx.team.findUnique({ where: { id: teamId }, select: { id: true } });
        if (!existing) throw new TeamNotFoundError();
      } else {
        try {
          const created = await tx.team.create({ data: { name: team.name } });
          teamId = created.id;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new DuplicateTeamNameError();
          }
          throw error;
        }
      }

      await tx.matchResult.create({
        data: {
          matchId: match.id,
          teamId,
          rank: team.rank,
          kills: team.kills,
          placementPoints: scored.placementPoints,
          killPoints: scored.killPoints,
          totalPoints: scored.totalPoints,
        },
      });
    }

    return match;
  });
}

export async function listMatches(): Promise<MatchHistoryItem[]> {
  const matches = await prisma.match.findMany({
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
    include: {
      results: {
        include: { team: { select: { name: true } } },
        orderBy: { rank: "asc" },
      },
    },
  });

  return matches.map((match) => ({
    id: match.id,
    playedAt: match.playedAt.toISOString(),
    imageHash: match.imageHash,
    results: match.results.map((result) => ({
      id: result.id,
      rank: result.rank,
      teamName: result.team.name,
      kills: result.kills,
      placementPoints: result.placementPoints,
      killPoints: result.killPoints,
      totalPoints: result.totalPoints,
    })),
  }));
}

export async function deleteMatch(id: string): Promise<boolean> {
  const existing = await prisma.match.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  await prisma.match.delete({ where: { id } });
  return true;
}
