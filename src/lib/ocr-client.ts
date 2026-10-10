const MODEL_PATH = "/tessdata";
const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
const MAX_EDGE = 960;

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
  const image = await shrinkInBrowser(file);
  console.info("[사진 분석] 사진을 줄였습니다.", { bytes: image.size });
  lastLoggedProgress = -1;
  const result = await engine.recognize(image, {}, { text: true });
  const text = result.data.text ?? "";
  console.info("[사진 분석] 글자를 읽었습니다.", { ms: Date.now() - started, chars: text.length, preview: text.slice(0, 240) });
  return text;
}

async function getWorker() {
  if (!workerPromise) {
    console.info("[사진 분석] 글자 인식 준비를 시작합니다.");
    workerPromise = loadTesseract()
      .then((tesseract) =>
        tesseract.createWorker(
          "eng",
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
          tessedit_pageseg_mode: "6",
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

function shrinkInBrowser(file: File) {
  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("blob"));
        else resolve(blob);
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}
