import "server-only";
import OpenAI, { APIError } from "openai";
import { ExtractError, parseExtractedPayload, type ExtractedTeam } from "./extract";

export class ConfigError extends Error {
  constructor() {
    super("OPENAI_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요.");
    this.name = "ConfigError";
  }
}

export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisError";
  }
}

const SYSTEM_PROMPT = `You extract PUBG match result rows from a screenshot.
Return a JSON object with exactly this shape:
{"teams":[{"name": string | null, "rank": number | null, "kills": number | null}]}

Rules:
- Read only what is visibly printed.
- If a value cannot be read, set it to null.
- Never guess, infer, complete, or calculate a missing value.
- Do not compute scores.
- "rank" is the placement. 1 means first place.
- "kills" is the kill count, not a point total.
- Copy team names exactly, including spaces and Korean characters.
- Include every visible team row.
- Do not include headers, labels, or summary rows that are not a team.`;

export async function extractTeamsFromImage(bytes: Uint8Array, mime: string): Promise<ExtractedTeam[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ConfigError();

  const client = new OpenAI({ apiKey, timeout: 60_000 });
  let content: string | null | undefined;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 PUBG 매치 결과 스크린샷에서 팀명, 순위, 킬만 추출하세요. 읽을 수 없는 값은 null로 두고 절대 추측하지 마세요. 점수는 계산하지 마세요.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });
    content = completion.choices[0]?.message?.content;
  } catch (error) {
    if (error instanceof APIError) {
      console.error("OpenAI request failed", error.status);
      if (error.status === 401) {
        throw new AnalysisError("OpenAI API 키가 올바르지 않습니다. .env.local의 OPENAI_API_KEY를 확인해 주세요.");
      }
      if (error.status === 429) {
        throw new AnalysisError("OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.");
      }
      throw new AnalysisError("이미지 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw new AnalysisError("이미지 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!content) throw new ExtractError();
  return parseExtractedPayload(content);
}
