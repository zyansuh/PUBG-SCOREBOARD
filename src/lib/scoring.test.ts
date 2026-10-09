import { describe, expect, it } from "vitest";
import { aggregateStandings, killPoints, placementPoints, scoreTeam } from "./scoring";

describe("placementPoints", () => {
  it("순위별 점수를 규칙대로 준다", () => {
    expect(placementPoints(1)).toBe(10);
    expect(placementPoints(2)).toBe(6);
    expect(placementPoints(3)).toBe(5);
    expect(placementPoints(4)).toBe(4);
    expect(placementPoints(5)).toBe(3);
    expect(placementPoints(6)).toBe(2);
    expect(placementPoints(7)).toBe(1);
    expect(placementPoints(8)).toBe(1);
  });

  it("9위 이하는 0점이다", () => {
    expect(placementPoints(9)).toBe(0);
    expect(placementPoints(16)).toBe(0);
  });

  it("순위가 1 미만이거나 정수가 아니면 거절한다", () => {
    expect(() => placementPoints(0)).toThrow(/순위/);
    expect(() => placementPoints(-1)).toThrow(/순위/);
    expect(() => placementPoints(1.5)).toThrow(/순위/);
  });
});

describe("killPoints", () => {
  it("1킬은 1점이다", () => {
    expect(killPoints(0)).toBe(0);
    expect(killPoints(1)).toBe(1);
    expect(killPoints(7)).toBe(7);
  });

  it("음수나 소수는 거절한다", () => {
    expect(() => killPoints(-1)).toThrow(/킬/);
    expect(() => killPoints(1.2)).toThrow(/킬/);
  });
});

describe("scoreTeam", () => {
  it("총점은 순위 점수와 킬 점수의 합이다", () => {
    expect(scoreTeam(1, 8)).toEqual({
      placementPoints: 10,
      killPoints: 8,
      totalPoints: 18,
    });
    expect(scoreTeam(9, 3)).toEqual({
      placementPoints: 0,
      killPoints: 3,
      totalPoints: 3,
    });
  });
});

describe("aggregateStandings", () => {
  it("여러 매치의 순위 점수와 킬 점수를 누적한다", () => {
    const standings = aggregateStandings([
      { teamId: "a", teamName: "A", rank: 1, kills: 4 },
      { teamId: "a", teamName: "A", rank: 3, kills: 2 },
    ]);

    expect(standings).toHaveLength(1);
    expect(standings[0]).toMatchObject({
      rank: 1,
      placementPoints: 15,
      killPoints: 6,
      totalPoints: 21,
      wins: 1,
      matches: 2,
    });
  });

  it("총점이 같으면 킬 점수가 높은 팀이 앞선다", () => {
    const standings = aggregateStandings([
      { teamId: "low-kills", teamName: "낮은킬", rank: 1, kills: 0 },
      { teamId: "high-kills", teamName: "높은킬", rank: 2, kills: 4 },
    ]);

    expect(standings.map((row) => row.teamId)).toEqual(["high-kills", "low-kills"]);
    expect(standings[0].totalPoints).toBe(standings[1].totalPoints);
  });

  it("총점과 킬 점수가 같으면 1위 횟수가 많은 팀이 앞선다", () => {
    const standings = aggregateStandings([
      { teamId: "b", teamName: "B", rank: 2, kills: 0 },
      { teamId: "b", teamName: "B", rank: 2, kills: 0 },
      { teamId: "b", teamName: "B", rank: 4, kills: 0 },
      { teamId: "b", teamName: "B", rank: 4, kills: 0 },
      { teamId: "a", teamName: "A", rank: 1, kills: 0 },
      { teamId: "a", teamName: "A", rank: 1, kills: 0 },
    ]);

    expect(standings.map((row) => row.teamId)).toEqual(["a", "b"]);
    expect(standings[0].totalPoints).toBe(20);
    expect(standings[0].wins).toBe(2);
    expect(standings[1].wins).toBe(0);
  });

  it("세 기준이 모두 같으면 팀명 가나다순이다", () => {
    const standings = aggregateStandings([
      { teamId: "sea", teamName: "바다", rank: 1, kills: 0 },
      { teamId: "potato", teamName: "감자", rank: 1, kills: 0 },
    ]);

    expect(standings.map((row) => row.teamName)).toEqual(["감자", "바다"]);
  });

  it("결과가 없으면 빈 배열이다", () => {
    expect(aggregateStandings([])).toEqual([]);
  });
});
