import { describe, expect, it } from "vitest";
import { readMatchRows } from "./ocr-rows";

const roster = [
  { slot: 1, name: "치킨은사랑입니다" },
  { slot: 2, name: "Team OPSN" },
  { slot: 3, name: "감자튀김단" },
];

describe("readMatchRows", () => {
  it("사진의 TEAM 번호를 저장한 칸과 연결하고 순위와 킬을 읽는다", () => {
    const text = ["3 TEAM 1 8 1400", "1 TEAM 2 2 900", "4 TEAM 9 1 100"].join("\n");

    expect(readMatchRows(text, roster)).toEqual([
      { name: "Team OPSN", rank: 1, kills: 2 },
      { name: "치킨은사랑입니다", rank: 3, kills: 8 },
    ]);
  });

  it("칸 번호와 순위, 킬이 다른 줄이어도 연결한다", () => {
    const text = ["3", "TEAM 1", "8"].join("\n");

    expect(readMatchRows(text, roster)).toEqual([{ name: "치킨은사랑입니다", rank: 3, kills: 8 }]);
  });

  it("칸 번호가 없으면 저장된 팀 이름으로 맞춘다", () => {
    expect(readMatchRows("1 Tean OPSN 3 800", [{ slot: 2, name: "Team OPSN" }])).toEqual([
      { name: "Team OPSN", rank: 1, kills: 3 },
    ]);
  });

  it("매치 결과의 #순위와 팀 번호를 저장한 칸과 연결한다", () => {
    const roster = [
      { slot: 1, name: "1팀" },
      { slot: 2, name: "2팀" },
      { slot: 3, name: "3팀" },
      { slot: 4, name: "4팀" },
      { slot: 5, name: "5팀" },
      { slot: 6, name: "6팀" },
      { slot: 7, name: "7팀" },
    ];
    const text = ["#1 팀7", "1", "#2 팀 2", "#321", "#3 팀1", "1", "#4 팅5", "1", "#5 팀 3", "#6 팀4", "#6 G4", "#7 팀6"].join("\n");

    expect(readMatchRows(text, roster)).toEqual([
      { name: "7팀", rank: 1, kills: 1 },
      { name: "2팀", rank: 2, kills: null },
      { name: "1팀", rank: 3, kills: 1 },
      { name: "5팀", rank: 4, kills: 1 },
      { name: "3팀", rank: 5, kills: null },
      { name: "4팀", rank: 6, kills: null },
      { name: "6팀", rank: 7, kills: null },
    ]);
  });

  it("팀 칸이 보이지 않으면 그 팀은 넣지 않는다", () => {
    expect(readMatchRows("헤더만 있는 사진", roster)).toEqual([]);
  });
});
