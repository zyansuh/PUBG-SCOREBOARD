import { describe, expect, it } from "vitest";
import { assignExtractedTeams, nameSimilarity, normalizeRosterEntries, normalizeTeamName, suggestTeams } from "./teams";

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

describe("normalizeRosterEntries", () => {
  it("빈 칸을 남기고 10개를 넘기면 거절한다", () => {
    const parsed = normalizeRosterEntries([
      { id: null, name: " Team OPSN " },
      { id: "a", name: "" },
    ]);
    expect(parsed).toEqual({
      entries: [
        { id: null, name: "Team OPSN" },
        { id: "a", name: "" },
      ],
    });
    expect("error" in normalizeRosterEntries(Array.from({ length: 11 }, () => ({ id: null, name: "팀" })))).toBe(true);
  });

  it("같은 이름은 한 번만 받는다", () => {
    const parsed = normalizeRosterEntries([
      { id: null, name: "Team OPSN" },
      { id: null, name: "team_opsn" },
    ]);
    expect(parsed).toEqual({ error: "같은 팀 이름이 두 번 있습니다." });
  });
});

describe("assignExtractedTeams", () => {
  const roster = [
    { id: "opsn", name: "Team OPSN" },
    { id: "chicken", name: "치킨은사랑입니다" },
  ];

  it("사진에서 읽은 이름을 등록 팀 철자로 맞춘다", () => {
    const assigned = assignExtractedTeams(
      [
        { name: "team opsn", rank: 2, kills: 4 },
        { name: "치킨은사랑합니다", rank: 1, kills: 6 },
      ],
      roster,
    );

    expect(assigned).toEqual([
      { name: "Team OPSN", rank: 2, kills: 4, teamId: "opsn" },
      { name: "치킨은사랑입니다", rank: 1, kills: 6, teamId: "chicken" },
    ]);
  });

  it("한 등록 팀에는 더 비슷한 행만 연결한다", () => {
    const assigned = assignExtractedTeams(
      [
        { name: "치킨은사랑합니다", rank: 1, kills: 3 },
        { name: "치킨은사랑입니디", rank: 4, kills: 1 },
      ],
      [{ id: "chicken", name: "치킨은사랑입니다" }],
    );

    expect(assigned[0]?.teamId).toBe("chicken");
    expect(assigned.filter((row) => row.teamId === "chicken")).toHaveLength(1);
  });
});
