"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07090d] px-4 text-center">
      <div>
        <h1 className="text-2xl font-black">화면을 불러오지 못했습니다.</h1>
        <button type="button" onClick={reset} className="mt-4 bg-[#F2A900] px-4 py-2 text-sm font-black text-black">
          다시 시도
        </button>
      </div>
    </main>
  );
}
