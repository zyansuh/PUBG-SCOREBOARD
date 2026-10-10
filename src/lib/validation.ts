import { scoreTeam } from "./scoring";
import { normalizeTeamName, suggestTeams, type TeamOption } from "./teams";

export type RowIssues = {
  name: Array<"empty" | "duplicate" | "long">;
  rank: Array<"empty" | "invalid" | "duplicate">;
  kills: Array<"empty" | "invalid">;
};

export type ParsedRow = {
  name: string | null;
  rank: number | null;
  kills: number | null;
  rankInvalid: boolean;
  killsInvalid: boolean;
};

export type Resolution = "unset" | "new" | "merge" | "auto";

export type PlannedTeam = {
  name: string;
  rank: number;
  kills: number;
  teamId: string | null;
};

const NAME_MAX = 40;
const RANK_MAX = 200;
const KILLS_MAX = 500;

export function parseDraftFields(input: { name: string; rank: string; kills: string }): ParsedRow {
  const name = input.name.trim().replace(/\s+/g, " ");
  const rank = parseInteger(input.rank);
  const kills = parseInteger(input.kills);
  return {
    name: name.length > 0 ? name : null,
    rank: rank.invalid ? null : rank.value,
    kills: kills.invalid ? null : kills.value,
    rankInvalid: rank.invalid,
    killsInvalid: kills.invalid,
  };
}

export function inspectRows(rows: ParsedRow[]): RowIssues[] {
  const nameCounts = new Map<string, number>();
  const rankCounts = new Map<number, number>();

  for (const row of rows) {
    if (row.name) {
      const key = normalizeTeamName(row.name);
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }
    if (!row.rankInvalid && row.rank !== null && row.rank >= 1 && row.rank <= RANK_MAX) {
      rankCounts.set(row.rank, (rankCounts.get(row.rank) ?? 0) + 1);
    }
  }

  return rows.map((row) => {
    const issues: RowIssues = { name: [], rank: [], kills: [] };

    if (!row.name) issues.name.push("empty");
    else if (row.name.length > NAME_MAX) issues.name.push("long");
    else if ((nameCounts.get(normalizeTeamName(row.name)) ?? 0) > 1) issues.name.push("duplicate");

    if (row.rankInvalid) issues.rank.push("invalid");
    else if (row.rank === null) issues.rank.push("empty");
    else if (row.rank < 1 || row.rank > RANK_MAX) issues.rank.push("invalid");
    else if ((rankCounts.get(row.rank) ?? 0) > 1) issues.rank.push("duplicate");

    if (row.killsInvalid) issues.kills.push("invalid");
    else if (row.kills === null) issues.kills.push("empty");
    else if (row.kills < 0 || row.kills > KILLS_MAX) issues.kills.push("invalid");

    return issues;
  });
}

export function rowHasIssues(issues: RowIssues): boolean {
  return issues.name.length + issues.rank.length + issues.kills.length > 0;
}

export function issueMessages(rows: RowIssues[]): string[] {
  const has = (field: keyof RowIssues, code: string) =>
    rows.some((issues) => (issues[field] as string[]).includes(code));
  const messages: string[] = [];
  if (has("name", "empty")) messages.push("팀명이 비어 있는 행이 있습니다.");
  if (has("name", "long")) messages.push(`팀명은 ${NAME_MAX}자 이하여야 합니다.`);
  if (has("name", "duplicate")) messages.push("같은 매치에 중복된 팀명이 있습니다.");
  if (has("rank", "empty")) messages.push("순위가 비어 있는 행이 있습니다.");
  if (has("rank", "invalid")) messages.push("순위는 1 이상의 정수여야 합니다.");
  if (has("rank", "duplicate")) messages.push("같은 순위가 두 팀 이상입니다.");
  if (has("kills", "empty")) messages.push("킬 수가 비어 있는 행이 있습니다.");
  if (has("kills", "invalid")) messages.push("킬 수는 0 이상의 정수여야 합니다.");
  return messages;
}

export function validateSubmission(
  body: unknown,
  existingTeams: TeamOption[],
): { ok: true; imageHash: string; playedAt: Date; teams: PlannedTeam[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  }

  const record = body as Record<string, unknown>;
  if (typeof record.imageHash !== "string" || !/^[a-f0-9]{64}$/.test(record.imageHash)) {
    return { ok: false, error: "입력 식별자가 올바르지 않습니다. 다시 입력해 주세요." };
  }
  if (typeof record.playedAt !== "string") {
    return { ok: false, error: "경기 일시를 입력해 주세요." };
  }
  const playedAt = new Date(record.playedAt);
  if (Number.isNaN(playedAt.getTime())) {
    return { ok: false, error: "경기 일시 형식이 올바르지 않습니다." };
  }
  if (!Array.isArray(record.teams) || record.teams.length === 0) {
    return { ok: false, error: "반영할 팀이 없습니다." };
  }
  if (record.teams.length > 100) {
    return { ok: false, error: "한 매치에 너무 많은 팀이 있습니다." };
  }

  const incoming = record.teams.map(readIncomingTeam);
  const issues = inspectRows(incoming);
  if (issues.some(rowHasIssues)) {
    return { ok: false, error: issueMessages(issues)[0] ?? "입력값을 확인해 주세요." };
  }

  const planned: PlannedTeam[] = [];
  const usedTeamIds = new Set<string>();
  const occupiedNames = new Set<string>();

  for (const row of incoming) {
    if (!row.name || row.rank === null || row.kills === null) {
      return { ok: false, error: "입력값을 확인해 주세요." };
    }

    try {
      scoreTeam(row.rank, row.kills);
    } catch {
      return { ok: false, error: "점수 계산에 실패했습니다. 순위와 킬을 확인해 주세요." };
    }

    const suggestions = suggestTeams(row.name, existingTeams);
    let teamId: string | null = null;

    if (suggestions.length > 0) {
      if (row.resolution === "merge") {
        if (!row.teamId || !existingTeams.some((team) => team.id === row.teamId)) {
          return { ok: false, error: `"${row.name}"을 합칠 기존 팀을 선택해 주세요.` };
        }
        if (usedTeamIds.has(row.teamId)) {
          return { ok: false, error: "같은 기존 팀을 한 매치에 두 번 선택할 수 없습니다." };
        }
        usedTeamIds.add(row.teamId);
        teamId = row.teamId;
      } else if (row.resolution !== "new") {
        return {
          ok: false,
          error: `"${row.name}"과 비슷한 기존 팀이 있습니다. 합칠지 새 팀으로 등록할지 선택해 주세요.`,
        };
      }
    }

    const occupiedName = teamId
      ? normalizeTeamName(existingTeams.find((team) => team.id === teamId)?.name ?? row.name)
      : normalizeTeamName(row.name);
    if (occupiedNames.has(occupiedName)) {
      return { ok: false, error: "같은 매치에 중복된 팀명이 있습니다." };
    }
    occupiedNames.add(occupiedName);
    planned.push({ name: row.name, rank: row.rank, kills: row.kills, teamId });
  }

  return { ok: true, imageHash: record.imageHash, playedAt, teams: planned };
}

function parseInteger(value: string): { value: number | null; invalid: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { value: null, invalid: false };
  if (!/^-?\d+$/.test(trimmed)) return { value: null, invalid: true };
  return { value: Number(trimmed), invalid: false };
}

function readIncomingTeam(value: unknown): ParsedRow & { teamId: string | null; resolution: Resolution } {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const name = typeof record.name === "string" ? record.name.trim().replace(/\s+/g, " ") : "";
  const rank = readServerInteger(record.rank);
  const kills = readServerInteger(record.kills);
  const resolution: Resolution =
    record.resolution === "new" || record.resolution === "merge" || record.resolution === "auto"
      ? record.resolution
      : "unset";

  return {
    name: name.length > 0 ? name : null,
    rank: rank.invalid ? null : rank.value,
    kills: kills.invalid ? null : kills.value,
    rankInvalid: rank.invalid,
    killsInvalid: kills.invalid,
    teamId: typeof record.teamId === "string" && record.teamId.trim() ? record.teamId.trim() : null,
    resolution,
  };
}

function readServerInteger(value: unknown): { value: number | null; invalid: boolean } {
  if (value === null || value === undefined || value === "") return { value: null, invalid: false };
  if (typeof value === "number" && Number.isInteger(value)) return { value, invalid: false };
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return { value: Number(value.trim()), invalid: false };
  return { value: null, invalid: true };
}
