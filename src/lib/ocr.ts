import "server-only";
import { tmpdir } from "node:os";
import { createWorker, type Worker } from "tesseract.js";
import { ExtractError, type ExtractedTeam } from "./extract";
import { readMatchRows, type RosterSlotName } from "./ocr-rows";

let workerPromise: Promise<Worker> | null = null;

export async function recognizeMatchImage(bytes: Uint8Array, roster: RosterSlotName[]): Promise<ExtractedTeam[]> {
  if (roster.length === 0) {
    throw new ExtractError("저장된 팀 이름이 없습니다. 팀 명단을 저장한 뒤 사진을 올려 주세요.");
  }

  let text = "";
  try {
    const engine = await getWorker();
    const result = await engine.recognize(Buffer.from(bytes));
    text = result.data.text ?? "";
  } catch (error) {
    console.error("ocr failed", error instanceof Error ? error.message : "unknown");
    throw new ExtractError("사진에서 글자를 읽지 못했습니다. JPG 또는 PNG로 다시 올려 주세요.");
  }

  if (!text.trim()) {
    throw new ExtractError("사진에서 글자를 읽지 못했습니다. 순위, 팀명, 킬이 보이는 이미지로 다시 올려 주세요.");
  }

  const rows = readMatchRows(text, roster);
  if (rows.length === 0) {
    throw new ExtractError("사진에서 TEAM 1 같은 칸 번호를 찾지 못했습니다. 저장한 칸 번호, 순위, 킬이 보이게 찍어 주세요.");
  }
  return rows;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("kor+eng", 1, {
      cachePath: tmpdir(),
      errorHandler: (message) => console.error("ocr worker", message),
    }).catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}
