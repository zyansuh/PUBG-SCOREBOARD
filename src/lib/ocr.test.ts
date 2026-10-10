import { describe, expect, it } from "vitest";
import { readMatchRows } from "./ocr-rows";

describe("readMatchRows", () => {
  it("저장된 팀의 순위와 킬을 읽고 데미지는 무시한다", () => {
    const text = ["1 Team OPSN 8 1400", "2 치킨은사랑입니다 5 900", "4 다른팀 1 100"].join("\n");

    expect(readMatchRows(text, ["치킨은사랑입니다", "Team OPSN", "감자튀김단"])).toEqual([
      { name: "Team OPSN", rank: 1, kills: 8 },
      { name: "치킨은사랑입니다", rank: 2, kills: 5 },
    ]);
  });

  it("한 글자가 달라도 팀 이름을 맞춘다", () => {
    expect(readMatchRows("1 Tean OPSN 3 800", ["Team OPSN"])).toEqual([{ name: "Team OPSN", rank: 1, kills: 3 }]);
  });

  it("팀이 보이지 않으면 그 팀은 넣지 않는다", () => {
    expect(readMatchRows("헤더만 있는 사진", ["Team OPSN"])).toEqual([]);
  });
});
