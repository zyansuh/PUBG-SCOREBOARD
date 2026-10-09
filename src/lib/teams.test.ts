import { describe, expect, it } from "vitest";
import { nameSimilarity, normalizeTeamName, suggestTeams } from "./teams";

describe("normalizeTeamName", () => {
  it("공백, 대소문자, 밑줄을 무시한다", () => {
    expect(normalizeTeamName(" Team   OPSN ")).toBe(normalizeTeamName("team_opsn"));
    expect(normalizeTeamName("치킨은 사랑입니다")).toBe(normalizeTeamName("치킨은사랑입니다"));
  });
});

describe("nameSimilarity", () => {
  it("표기만 다르면 같은 팀으로 본다", () => {
    expect(nameSimilarity("Team OPSN", "team  opsn")).toBe(1);
  });

  it("한 글자 차이는 합치기 후보가 된다", () => {
    expect(nameSimilarity("치킨은사랑입니다", "치킨은사랑합니다")).toBeGreaterThanOrEqual(0.75);
  });

  it("전혀 다른 팀명은 후보가 되지 않는다", () => {
    expect(nameSimilarity("감자튀김단", "무지성돌격대")).toBeLessThan(0.75);
  });
});

describe("suggestTeams", () => {
  it("비슷한 기존 팀만 돌려준다", () => {
    const suggestions = suggestTeams("치킨은 사랑합니다", [
      { id: "1", name: "치킨은사랑입니다" },
      { id: "2", name: "Team OPSN" },
    ]);

    expect(suggestions.map((team) => team.id)).toEqual(["1"]);
  });
});
