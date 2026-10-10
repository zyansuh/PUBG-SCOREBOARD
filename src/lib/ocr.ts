import "server-only";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { ANALYSIS_LIMIT_MS, ANALYSIS_TIMEOUT_MESSAGE } from "./analysis-limit";
import { ExtractError, type ExtractedTeam } from "./extract";
import { readMatchRows, type RosterSlotName } from "./ocr-rows";

const MAX_EDGE = 960;
const LANG_PATH = path.join(process.cwd(), "src", "lib", "tessdata");
const CACHE_PATH = path.join(tmpdir(), "pubg-ocr-fast");

let workerPromise: Promise<Worker> | null = null;
let workerGeneration = 0;
let lastLoggedProgress = -1;

export async function recognizeMatchImage(
  bytes: Uint8Array,
  roster: RosterSlotName[],
  parentSignal?: AbortSignal,
): Promise<ExtractedTeam[]> {
  if (roster.length === 0) {
    throw new ExtractError("저장된 팀 이름이 없습니다. 팀 명단을 저장한 뒤 사진을 올려 주세요.");
  }

  const signal = parentSignal
    ? AbortSignal.any([parentSignal, AbortSignal.timeout(ANALYSIS_LIMIT_MS)])
    : AbortSignal.timeout(ANALYSIS_LIMIT_MS);
  let text = "";
  let engine: Worker | undefined;
  let recognition: Promise<unknown> | undefined;
  try {
    console.info("[사진 분석] 글자 인식을 시작합니다.", { bytes: bytes.byteLength, roster: roster.length, limitMs: ANALYSIS_LIMIT_MS });
    engine = await withDeadline(getWorker(), signal);
    const image = await withDeadline(shrinkImage(bytes), signal);
    console.info("[사진 분석] 사진을 줄였습니다.", { bytes: image.byteLength });
    lastLoggedProgress = -1;
    const pending = engine.recognize(image, {}, { text: true });
    recognition = pending;
    const result = await withDeadline(pending, signal);
    text = result.data.text ?? "";
    console.info("[사진 분석] 글자를 읽었습니다.", { chars: text.length, preview: text.slice(0, 240) });
  } catch (error) {
    void recognition?.catch(() => undefined);
    if (signal.aborted || (error instanceof ExtractError && error.message === ANALYSIS_TIMEOUT_MESSAGE)) {
      console.info("[사진 분석] 10초 제한에 걸려 읽기를 멈췄습니다.");
      dropWorker(engine);
      throw new ExtractError(ANALYSIS_TIMEOUT_MESSAGE);
    }
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
    const generation = workerGeneration;
    console.info("[사진 분석] 글자 인식 준비를 시작합니다.");
    workerPromise = createWorker("eng", 1, {
      langPath: LANG_PATH,
      cachePath: CACHE_PATH,
      gzip: true,
      logger: logOcrProgress,
      errorHandler: (message) => console.error("ocr worker", message),
    })
      .then(async (worker) => {
        if (generation !== workerGeneration) {
          await worker.terminate();
          throw new Error("worker discarded");
        }
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n",
        });
        console.info("[사진 분석] 글자 인식 준비가 끝났습니다.");
        return worker;
      })
      .catch((error: unknown) => {
        if (generation === workerGeneration) workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

function dropWorker(engine?: Worker) {
  workerGeneration += 1;
  workerPromise = null;
  if (!engine) return;
  void engine.terminate().catch((error: unknown) => {
    console.error("ocr worker terminate", error instanceof Error ? error.message : "unknown");
  });
}

function withDeadline<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new ExtractError(ANALYSIS_TIMEOUT_MESSAGE));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new ExtractError(ANALYSIS_TIMEOUT_MESSAGE));
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
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
