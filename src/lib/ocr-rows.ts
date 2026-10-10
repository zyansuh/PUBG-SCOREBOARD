import type { ExtractedTeam } from "./extract";
import { nameSimilarity, normalizeTeamName } from "./teams";

const NAME_MATCH = 0.75;
const RANK_MAX = 30;
const KILL_MAX = 99;
const SLOT_LABEL = /(?:team|tem|tean|팀)[\s_\-]*(\d{1,2})|(\d{1,2})[\s_\-]*팀/i;
const LABELED_CARD = /#\s*(\d{1,2})\s*(?:팀|team|tem|tean|팅|님)\s*(\d{1,2})/i;
const LOOSE_CARD = /#\s*(\d{1,2})\s*[^0-9#\s][^0-9#]{0,2}\s*(\d{1,2})/;
const MASHED_CARD = /^#\s*(\d)(\d)(\d)\s*$/;

export type RosterSlotName = {
  slot: number;
  name: string;
};

export function readMatchRows(text: string, roster: RosterSlotName[]): ExtractedTeam[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const cards = resultCards(text);
  if (cards.size > 0) {
    return roster
      .flatMap((team) => {
        const card = cards.get(team.slot);
        if (!card) return [];
        return [{ name: team.name, rank: card.rank, kills: card.kills }];
      })
      .sort(byRank);
  }

  const slotLines = linesBySlot(lines);

  if (slotLines.size > 0) {
    return roster
      .flatMap((team) => {
        const line = slotLines.get(team.slot);
        if (!line) return [];
        const numbers = placementAndKills(stripSlotLabel(line));
        return [{ name: team.name, rank: numbers.rank, kills: numbers.kills }];
      })
      .sort(byRank);
  }

  return roster
    .flatMap((team) => {
      const found = bestLine(lines, team.name);
      if (!found) return [];
      const numbers = placementAndKills(found);
      return [{ name: team.name, rank: numbers.rank, kills: numbers.kills }];
    })
    .sort(byRank);
}

function resultCards(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const cards = new Map<number, { rank: number; kills: number | null; labeled: boolean }>();

  lines.forEach((line, index) => {
    const found = headerCard(line);
    if (!found) return;
    const next = index + 1 < lines.length && lines[index + 1] ? lines[index + 1] : undefined;
    const card = { rank: found.rank, kills: killBeside(line, found.rank, found.slot, next), labeled: found.labeled };
    const existing = cards.get(found.slot);
    if (!existing || (!existing.labeled && card.labeled)) cards.set(found.slot, card);
  });

  return cards;
}

function headerCard(line: string) {
  const labeled = LABELED_CARD.exec(line);
  LABELED_CARD.lastIndex = 0;
  const labeledCard = labeled ? cardNumbers(labeled[1], labeled[2]) : null;
  if (labeledCard) return { ...labeledCard, labeled: true };

  const loose = LOOSE_CARD.exec(line);
  LOOSE_CARD.lastIndex = 0;
  const looseCard = loose ? cardNumbers(loose[1], loose[2]) : null;
  if (looseCard && looseCard.rank <= 16) return { ...looseCard, labeled: false };

  const mashed = MASHED_CARD.exec(line);
  MASHED_CARD.lastIndex = 0;
  const mashedCard = mashed ? cardNumbers(mashed[1], mashed[3]) : null;
  if (mashedCard) return { ...mashedCard, labeled: false };
  return null;
}

function cardNumbers(rankText: string, slotText: string) {
  const rank = Number(rankText);
  const slot = Number(slotText);
  if (rank < 1 || rank > RANK_MAX || slot < 1 || slot > 10) return null;
  return { rank, slot };
}

function killBeside(line: string, rank: number, slot: number, nextLine?: string) {
  const inline = leftoverNumber(line, rank, slot);
  if (inline !== null) return inline;
  if (!nextLine || nextLine.includes("#")) return null;
  const bare = /^\D*(\d{1,2})\D*$/.exec(nextLine);
  if (!bare) return null;
  const value = Number(bare[1]);
  return value <= KILL_MAX ? value : null;
}

function leftoverNumber(line: string, rank: number, slot: number) {
  const numbers = [...line.matchAll(/\d+/g)].map((match) => Number(match[0]));
  let skippedRank = false;
  let skippedSlot = false;
  for (const value of numbers) {
    if (!skippedRank && value === rank) {
      skippedRank = true;
      continue;
    }
    if (!skippedSlot && value === slot) {
      skippedSlot = true;
      continue;
    }
    if (value <= KILL_MAX) return value;
  }
  return null;
}

function linesBySlot(lines: string[]) {
  const slots = new Map<number, string>();
  const used = new Set<number>();

  lines.forEach((line, index) => {
    const slot = slotNumber(line);
    if (slot === null || slots.has(slot)) return;
    const rest = stripSlotLabel(line);
    if (/\d/.test(rest)) {
      slots.set(slot, line);
      used.add(index);
      return;
    }

    const previous = index > 0 && !used.has(index - 1) && isBareNumber(lines[index - 1]) ? lines[index - 1] : "";
    const next = index + 1 < lines.length && isBareNumber(lines[index + 1]) ? lines[index + 1] : "";
    slots.set(slot, `${previous} ${line} ${next}`.trim());
    used.add(index);
    if (previous) used.add(index - 1);
    if (next) used.add(index + 1);
  });

  return slots;
}

function slotNumber(line: string) {
  const match = SLOT_LABEL.exec(line);
  SLOT_LABEL.lastIndex = 0;
  if (!match) return null;
  const slot = Number(match[1] ?? match[2]);
  if (slot < 1 || slot > 10) return null;
  return slot;
}

function stripSlotLabel(line: string) {
  return line.replace(SLOT_LABEL, " ");
}

function isBareNumber(line: string) {
  return /^\d{1,4}$/.test(line.trim());
}

function bestLine(lines: string[], name: string) {
  let best = "";
  let bestScore = 0;
  for (const line of lines) {
    const score = lineNameScore(line, name);
    if (score < NAME_MATCH || score <= bestScore) continue;
    best = line;
    bestScore = score;
  }
  return bestScore === 0 ? null : best;
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
