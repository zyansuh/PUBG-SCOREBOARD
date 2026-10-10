export type ExtractedTeam = {
  name: string | null;
  rank: number | null;
  kills: number | null;
};

export class ExtractError extends Error {
  constructor(message = "인식 결과를 해석하지 못했습니다.") {
    super(message);
    this.name = "ExtractError";
  }
}

export function parseExtractedPayload(input: unknown): ExtractedTeam[] {
  let payload = input;
  if (typeof input === "string") {
    try {
      payload = JSON.parse(input);
    } catch {
      throw new ExtractError();
    }
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ExtractError();
  }

  const teams = (payload as { teams?: unknown }).teams;
  if (!Array.isArray(teams)) throw new ExtractError();
  if (teams.length > 100) {
    throw new ExtractError("인식된 팀 수가 너무 많습니다. 다시 분석해 주세요.");
  }

  return teams.map((team) => {
    if (!team || typeof team !== "object" || Array.isArray(team)) {
      return { name: null, rank: null, kills: null };
    }
    const record = team as Record<string, unknown>;
    return {
      name: asNullableString(record.name),
      rank: asNullableInt(record.rank),
      kills: asNullableInt(record.kills),
    };
  });
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}
