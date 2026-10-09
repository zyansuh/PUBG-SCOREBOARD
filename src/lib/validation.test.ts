import { describe, expect, it } from "vitest";
import { issueMessages, inspectRows, parseDraftFields, validateSubmission } from "./validation";

const hash = "a".repeat(64);
const existing = [
  { id: "chicken", name: "치킨은사랑입니다" },
  { id: "opsn", name: "Team OPSN" },
];

function submission(teams: unknown[]) {
  return validateSubmission(
    {
      imageHash: hash,
      playedAt: "2026-10-10T03:00:00.000Z",
      teams,
    },
    existing,
  );
}

describe("inspectRows", () => {
  it("빈 값, 음수 킬, 중복 순위를 표시한다", () => {
    const rows = [
      parseDraftFields({ name: "", rank: "1", kills: "-2" }),
      parseDraftFields({ name: "바다의신", rank: "1", kills: "3" }),
    ];
    const issues = inspectRows(rows);

    expect(issues[0].name).toContain("empty");
    expect(issues[0].kills).toContain("invalid");
    expect(issues[0].rank).toContain("duplicate");
    expect(issues[1].rank).toContain("duplicate");
    expect(issueMessages(issues).length).toBeGreaterThan(0);
  });
});

describe("validateSubmission", () => {
  it("새 팀 결과를 받아들인다", () => {
    const result = submission([
      { name: "새로운팀", rank: 1, kills: 4, teamId: null, resolution: "new" },
      { name: "다른팀", rank: 2, kills: 1, teamId: null, resolution: "new" },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.teams[0]).toMatchObject({ name: "새로운팀", rank: 1, kills: 4, teamId: null });
    }
  });

  it("비슷한 팀인데 선택을 안 하면 거절한다", () => {
    const result = submission([
      { name: "치킨은 사랑합니다", rank: 1, kills: 2, teamId: null, resolution: "unset" },
    ]);

    expect(result.ok).toBe(false);
  });

  it("합치기를 선택하면 기존 팀 id를 유지한다", () => {
    const result = submission([
      { name: "치킨은 사랑입니다", rank: 1, kills: 2, teamId: "chicken", resolution: "merge" },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.teams[0].teamId).toBe("chicken");
  });

  it("새 팀으로 등록하겠다고 하면 별도 팀으로 둔다", () => {
    const result = submission([
      { name: "치킨은 사랑합니다", rank: 1, kills: 2, teamId: null, resolution: "new" },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.teams[0].teamId).toBeNull();
  });

  it("중복 순위는 거절한다", () => {
    const result = submission([
      { name: "A팀", rank: 1, kills: 1, resolution: "new" },
      { name: "B팀", rank: 1, kills: 2, resolution: "new" },
    ]);

    expect(result.ok).toBe(false);
  });
});
