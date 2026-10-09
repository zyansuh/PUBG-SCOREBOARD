import { describe, expect, it } from "vitest";
import { parseExtractedPayload } from "./extract";

describe("parseExtractedPayload", () => {
  it("팀 목록을 그대로 읽는다", () => {
    const teams = parseExtractedPayload({
      teams: [
        { name: "Team OPSN", rank: 1, kills: 8 },
        { name: null, rank: null, kills: null },
      ],
    });

    expect(teams).toEqual([
      { name: "Team OPSN", rank: 1, kills: 8 },
      { name: null, rank: null, kills: null },
    ]);
  });

  it("숫자 문자열은 읽고, 애매한 값은 null로 둔다", () => {
    const teams = parseExtractedPayload(
      JSON.stringify({
        teams: [{ name: "  일단살자  ", rank: "3", kills: 1.5 }],
      }),
    );

    expect(teams[0]).toEqual({ name: "일단살자", rank: 3, kills: null });
  });

  it("teams가 없으면 실패한다", () => {
    expect(() => parseExtractedPayload({ rows: [] })).toThrow(/해석/);
    expect(() => parseExtractedPayload("not-json")).toThrow(/해석/);
  });
});
