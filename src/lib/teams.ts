export type TeamOption = {
  id: string;
  name: string;
};

export type RosterEntry = {
  id: string | null;
  name: string;
};

export type AnalyzedTeam = {
  name: string | null;
  rank: number | null;
  kills: number | null;
  teamId: string | null;
};

export const SIMILARITY_THRESHOLD = 0.75;
export const ROSTER_SIZE = 10;
export const TEAM_NAME_MAX = 40;

export function normalizeTeamName(name: string): string {
  return name.normalize("NFKC").trim().toLowerCase().replace(/[\s_\-]+/g, "");
}

export function levenshtein(left: string, right: string): number {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const distances = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) distances[row][0] = row;
  for (let col = 0; col < cols; col += 1) distances[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      distances[row][col] = Math.min(
        distances[row - 1][col] + 1,
        distances[row][col - 1] + 1,
        distances[row - 1][col - 1] + cost,
      );
    }
  }

  return distances[left.length][right.length];
}

export function nameSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeTeamName(left);
  const normalizedRight = normalizeTeamName(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  const distance = levenshtein(normalizedLeft, normalizedRight);
  return 1 - distance / Math.max(normalizedLeft.length, normalizedRight.length);
}

export function suggestTeams(name: string, teams: TeamOption[]): Array<TeamOption & { similarity: number }> {
  const ranked = teams
    .map((team) => ({ ...team, similarity: nameSimilarity(name, team.name) }))
    .filter((team) => team.similarity >= SIMILARITY_THRESHOLD)
    .sort(
      (left, right) =>
        right.similarity - left.similarity || left.name.localeCompare(right.name, "ko"),
    );

  const exact = ranked.filter((team) => team.similarity === 1);
  const fuzzy = ranked.filter((team) => team.similarity < 1);
  return [...exact, ...fuzzy].slice(0, 4);
}

export function normalizeRosterEntries(input: unknown): { entries: RosterEntry[] } | { error: string } {
  if (!Array.isArray(input)) return { error: "팀 명단 형식이 올바르지 않습니다." };
  if (input.length > ROSTER_SIZE) return { error: "팀은 10개까지 등록할 수 있습니다." };

  const entries: RosterEntry[] = [];
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();

  for (const item of input) {
    if (!item || typeof item !== "object") return { error: "팀 명단 형식이 올바르지 않습니다." };
    const record = item as { id?: unknown; name?: unknown };
    const id = typeof record.id === "string" && record.id.trim() ? record.id.trim() : null;
    const name = typeof record.name === "string" ? record.name.trim().replace(/\s+/g, " ") : "";

    if (name.length > TEAM_NAME_MAX) return { error: "팀 이름은 40자 이하여야 합니다." };
    if (id) {
      if (seenIds.has(id)) return { error: "같은 팀이 두 칸에 들어 있습니다." };
      seenIds.add(id);
    }
    if (name) {
      const key = normalizeTeamName(name);
      if (!key) return { error: "팀 이름을 입력해 주세요." };
      if (seenNames.has(key)) return { error: "같은 팀 이름이 두 번 있습니다." };
      seenNames.add(key);
    }
    entries.push({ id, name });
  }

  if (entries.every((entry) => entry.name.length === 0)) {
    return { error: "팀 이름을 한 칸 이상 입력해 주세요." };
  }

  return { entries };
}

export function assignExtractedTeams<T extends { name: string | null }>(
  extracted: T[],
  roster: TeamOption[],
): Array<T & { teamId: string | null }> {
  const candidates: Array<{ index: number; team: TeamOption; similarity: number }> = [];

  extracted.forEach((row, index) => {
    if (!row.name) return;
    for (const team of roster) {
      const similarity = nameSimilarity(row.name, team.name);
      if (similarity >= SIMILARITY_THRESHOLD) {
        candidates.push({ index, team, similarity });
      }
    }
  });

  candidates.sort(
    (left, right) =>
      right.similarity - left.similarity ||
      left.index - right.index ||
      left.team.name.localeCompare(right.team.name, "ko"),
  );

  const usedRows = new Set<number>();
  const usedTeams = new Set<string>();
  const assigned = new Map<number, TeamOption>();

  for (const candidate of candidates) {
    if (usedRows.has(candidate.index) || usedTeams.has(candidate.team.id)) continue;
    usedRows.add(candidate.index);
    usedTeams.add(candidate.team.id);
    assigned.set(candidate.index, candidate.team);
  }

  return extracted.map((row, index) => {
    const team = assigned.get(index);
    if (!team) return { ...row, teamId: null };
    return { ...row, name: team.name, teamId: team.id };
  });
}
