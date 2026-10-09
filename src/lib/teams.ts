export type TeamOption = {
  id: string;
  name: string;
};

export const SIMILARITY_THRESHOLD = 0.75;

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
