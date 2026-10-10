import type { ExtractedTeam } from "./extract";
import { nameSimilarity, normalizeTeamName } from "./teams";

const NAME_MATCH = 0.75;
const RANK_MAX = 30;
const KILL_MAX = 99;

export function readMatchRows(text: string, rosterNames: string[]): ExtractedTeam[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const used = new Set<number>();
  const rows: ExtractedTeam[] = [];

  for (const name of rosterNames) {
    const found = bestLine(lines, name, used);
    if (!found) continue;
    used.add(found.index);
    const numbers = placementAndKills(found.line);
    rows.push({ name, rank: numbers.rank, kills: numbers.kills });
  }

  return rows.sort(byRank);
}

function bestLine(lines: string[], name: string, used: Set<number>) {
  let bestIndex = -1;
  let bestScore = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (used.has(index)) continue;
    const score = lineNameScore(lines[index], name);
    if (score < NAME_MATCH || score <= bestScore) continue;
    bestIndex = index;
    bestScore = score;
  }
  if (bestIndex < 0) return null;
  return { index: bestIndex, line: lines[bestIndex] };
}

function lineNameScore(line: string, name: string) {
  const normalizedName = normalizeTeamName(name);
  const normalizedLine = normalizeTeamName(line);
  if (!normalizedName || !normalizedLine) return 0;
  if (normalizedLine.includes(normalizedName)) return 1;
  if (normalizedLine.length < normalizedName.length) return nameSimilarity(normalizedLine, normalizedName);

  let best = 0;
  for (let index = 0; index <= normalizedLine.length - normalizedName.length; index += 1) {
    best = Math.max(best, nameSimilarity(normalizedLine.slice(index, index + normalizedName.length), normalizedName));
  }
  return best;
}

function placementAndKills(line: string) {
  const numbers = [...line.matchAll(/\d+/g)].map((match) => Number(match[0]));
  const rankIndex = numbers.findIndex((value) => value >= 1 && value <= RANK_MAX);
  if (rankIndex < 0) return { rank: null, kills: null };
  const kills = numbers.slice(rankIndex + 1).find((value) => value <= KILL_MAX);
  return { rank: numbers[rankIndex], kills: kills ?? null };
}

function byRank(left: ExtractedTeam, right: ExtractedTeam) {
  if (left.rank === null) return 1;
  if (right.rank === null) return -1;
  return left.rank - right.rank;
}
