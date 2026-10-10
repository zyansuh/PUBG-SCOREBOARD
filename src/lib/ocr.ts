import "server-only";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { ExtractError, type ExtractedTeam } from "./extract";
import { readMatchRows, type RosterSlotName } from "./ocr-rows";

const MAX_EDGE = 960;
const LANG_PATH = path.join(process.cwd(), "src", "lib", "tessdata");
const CACHE_PATH = path.join(tmpdir(), "pubg-ocr-fast");

let workerPromise: Promise<Worker> | null = null;
let lastLoggedProgress = -1;

export async function recognizeMatchImage(bytes: Uint8Array, roster: RosterSlotName[]): Promise<ExtractedTeam[]> {
  if (roster.length === 0) {
    throw new ExtractError("저장된 팀 이름이 없습니다. 팀 명단을 저장한 뒤 사진을 올려 주세요.");
  }

  let text = "";
  try {
    console.info("[사진 분석] 글자 인식을 시작합니다.", { bytes: bytes.byteLength, roster: roster.length });
    const started = Date.now();
    const engine = await getWorker();
    const image = await shrinkImage(bytes);
    console.info("[사진 분석] 사진을 줄였습니다.", { bytes: image.byteLength });
    lastLoggedProgress = -1;
    const result = await engine.recognize(image, {}, { text: true });
    text = result.data.text ?? "";
    console.info("[사진 분석] 글자를 읽었습니다.", { ms: Date.now() - started, chars: text.length, preview: text.slice(0, 240) });
  } catch (error) {
    console.error("ocr failed", error instanceof Error ? error.message : "unknown");
    throw new ExtractError("사진에서 글자를 읽지 못했습니다. JPG 또는 PNG로 다시 올려 주세요.");
  }

  if (!text.trim()) {
    throw new ExtractError("사진에서 글자를 읽지 못했습니다. 순위, 팀명, 킬이 보이는 이미지로 다시 올려 주세요.");
  }

  const rows = readMatchRows(text, roster);
  console.info("[사진 분석] 칸 번호를 맞췄습니다.", { rows: rows.length });
  if (rows.length === 0) {
    throw new ExtractError("사진에서 TEAM 1 같은 칸 번호를 찾지 못했습니다. 저장한 칸 번호, 순위, 킬이 보이게 찍어 주세요.");
  }
  return rows;
}

async function getWorker() {
  if (!workerPromise) {
    console.info("[사진 분석] 글자 인식 준비를 시작합니다.");
    workerPromise = createWorker(
      "eng",
      1,
      {
        langPath: LANG_PATH,
        cachePath: CACHE_PATH,
        gzip: true,
        logger: logOcrProgress,
        errorHandler: (message) => console.error("ocr worker", message),
      },
      {
        load_system_dawg: "0",
        load_freq_dawg: "0",
        load_unambig_dawg: "0",
        load_punc_dawg: "0",
        load_number_dawg: "0",
        load_bigram_dawg: "0",
      },
    )
      .then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n",
          user_defined_dpi: "300",
        });
        console.info("[사진 분석] 글자 인식 준비가 끝났습니다.");
        return worker;
      })
      .catch((error: unknown) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

function logOcrProgress(message: { status?: string; progress?: number }) {
  if (message.status !== "recognizing text") return;
  const percent = Math.round((message.progress ?? 0) * 100);
  const bucket = Math.floor(percent / 25) * 25;
  if (bucket === lastLoggedProgress) return;
  lastLoggedProgress = bucket;
  console.info(`[사진 분석] 글자를 읽는 중 ${percent}%`);
}

async function shrinkImage(bytes: Uint8Array) {
  try {
    return await sharp(Buffer.from(bytes))
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .grayscale()
      .normalise()
      .png()
      .toBuffer();
  } catch (error) {
    console.error("image resize failed", error instanceof Error ? error.message : "unknown");
    return Buffer.from(bytes);
  }
}
