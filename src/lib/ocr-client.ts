const MODEL_PATH = "/tessdata";
const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
const TARGET_EDGE = 1800;
const DARK_AVERAGE = 130;

type OcrWorker = {
  recognize: (image: Blob, options: Record<string, never>, output: { text: boolean }) => Promise<{ data: { text?: string | null } }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
};

type TesseractGlobal = {
  createWorker: (lang: string, oem: number, options: Record<string, unknown>, config: Record<string, string>) => Promise<OcrWorker>;
};

let workerPromise: Promise<OcrWorker> | null = null;
let lastLoggedProgress = -1;

export async function recognizeInBrowser(file: File) {
  console.info("[사진 분석] 브라우저에서 글자를 읽습니다.", { name: file.name, bytes: file.size });
  const started = Date.now();
  const engine = await getWorker();
  const images = await prepareImages(file);
  const texts: string[] = [];
  for (const image of images) {
    console.info("[사진 분석] 사진을 줄였습니다.", { bytes: image.size });
    lastLoggedProgress = -1;
    const result = await engine.recognize(image, {}, { text: true });
    texts.push(result.data.text ?? "");
  }
  const text = texts.join("\n\n");
  console.info("[사진 분석] 글자를 읽었습니다.", { ms: Date.now() - started, chars: text.length, preview: text.slice(0, 240) });
  return text;
}

async function getWorker() {
  if (!workerPromise) {
    console.info("[사진 분석] 글자 인식 준비를 시작합니다.");
    workerPromise = loadTesseract()
      .then((tesseract) =>
        tesseract.createWorker(
          "kor+eng",
          1,
          {
            langPath: new URL(MODEL_PATH, window.location.origin).href,
            gzip: true,
            logger: logOcrProgress,
            errorHandler: (message: unknown) => console.error("ocr worker", message),
          },
          {
            load_system_dawg: "0",
            load_freq_dawg: "0",
            load_unambig_dawg: "0",
            load_punc_dawg: "0",
            load_number_dawg: "0",
            load_bigram_dawg: "0",
          },
        ),
      )
      .then(async (worker) => {
        await worker.setParameters({
          tessedit_pageseg_mode: "11",
          tessedit_char_whitelist: "#팀팅님ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n",
          user_defined_dpi: "150",
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

function tesseractOnWindow() {
  return (window as unknown as { Tesseract?: TesseractGlobal }).Tesseract;
}

function loadTesseract() {
  const existing = tesseractOnWindow();
  if (existing) return Promise.resolve(existing);
  return new Promise<TesseractGlobal>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const loaded = tesseractOnWindow();
      if (!loaded) {
        reject(new Error("tesseract missing"));
        return;
      }
      resolve(loaded);
    };
    script.onerror = () => reject(new Error("tesseract load failed"));
    document.head.appendChild(script);
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

function prepareImages(file: File) {
  return new Promise<Blob[]>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = TARGET_EDGE / Math.max(image.width, image.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const stretched = stretchContrast(frame);
      const levels = stretched.average < DARK_AVERAGE ? [100, 110] : [null];
      void (async () => {
        const blobs: Blob[] = [];
        for (const level of levels) {
          blobs.push(await imageBlob(canvas, context, thresholdCopy(stretched.image, level)));
        }
        resolve(blobs);
      })().catch(reject);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

function stretchContrast(frame: ImageData) {
  const pixels = frame.data;
  let sum = 0;
  let min = 255;
  let max = 0;
  const gray: number[] = [];
  for (let index = 0; index < pixels.length; index += 4) {
    const value = Math.round(pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114);
    gray.push(value);
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = Math.max(1, max - min);
  const image = new ImageData(frame.width, frame.height);
  for (let index = 0; index < gray.length; index += 1) {
    const stretched = Math.round(((gray[index] - min) * 255) / span);
    const offset = index * 4;
    image.data[offset] = stretched;
    image.data[offset + 1] = stretched;
    image.data[offset + 2] = stretched;
    image.data[offset + 3] = 255;
  }
  return { image, average: sum / gray.length };
}

function thresholdCopy(source: ImageData, level: number | null) {
  const copy = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  if (level === null) return copy;
  for (let index = 0; index < copy.data.length; index += 4) {
    const value = copy.data[index] >= level ? 255 : 0;
    copy.data[index] = value;
    copy.data[index + 1] = value;
    copy.data[index + 2] = value;
  }
  return copy;
}

function imageBlob(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, image: ImageData) {
  context.putImageData(image, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("blob"));
      else resolve(blob);
    }, "image/png");
  });
}
