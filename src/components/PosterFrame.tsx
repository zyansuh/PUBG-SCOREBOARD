import Link from "next/link";

export function PosterFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-4 py-6 sm:px-8 sm:py-9">
      <header className="relative">
        <p className="text-center text-[9px] font-semibold tracking-[0.16em] text-white/80 sm:text-[12px] sm:tracking-[0.46em]">
          PUBG BATTLEGROUNDS COMMUNITY TOURNAMENT
        </p>
        <div className="relative mt-3 sm:mt-4">
          <div className="lg:px-28">
            <h1 className="flex flex-nowrap items-end justify-center gap-1 sm:gap-3">
              <BrushWord text="배그" wordClass="title-kr text-white" slashClass="text-white" />
              <BrushWord text="OPSN" wordClass="title-en text-[#FFC800]" slashClass="text-[#FFC800]" />
            </h1>
            <p className="mt-2 text-center text-base font-medium text-white drop-shadow sm:text-xl">
              함께하는 배틀그라운드, 우리의 <span className="font-black text-[#FFC800]">전장</span>!
            </p>
          </div>
          <div className="mt-4 flex items-end justify-between lg:mt-0">
            <ChickenDinner className="lg:absolute lg:top-8 lg:left-0" />
            <PubgMark className="lg:absolute lg:top-2 lg:right-0" />
          </div>
        </div>
      </header>

      <div className="mx-auto mt-5 w-full max-w-[880px] flex-1 sm:mt-7">{children}</div>

      <footer className="relative mx-auto mt-8 w-full max-w-[880px] pb-2">
        <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.32em] text-white/75 sm:gap-4 sm:text-xs sm:tracking-[0.48em]">
          <span className="h-px w-10 bg-[#F2A900] sm:w-16" />
          BATTLEGROUNDS × OPSN
          <span className="h-px w-10 bg-[#F2A900] sm:w-16" />
        </div>
        <p className="script-face mt-4 text-right text-3xl -rotate-6 sm:text-4xl">Good Luck!</p>
        <p className="mt-3 text-center">
          <Link href="/admin/upload" className="text-xs text-white/35 hover:text-[#F2A900] hover:underline">
            운영자 페이지
          </Link>
        </p>
      </footer>
    </div>
  );
}

function BrushWord({ text, wordClass, slashClass }: { text: string; wordClass: string; slashClass: string }) {
  return (
    <span className="relative inline-block shrink-0 px-1 sm:px-2">
      <svg viewBox="0 0 240 90" className={`absolute top-1/2 left-1/2 h-[135%] w-[128%] -translate-x-1/2 -translate-y-1/2 ${slashClass}`} aria-hidden>
        <path
          fill="currentColor"
          d="M14 58 C30 16 38 76 80 28 C114 0 106 70 152 24 C188 0 178 64 228 20 L232 40 C180 80 192 26 152 52 C112 84 122 22 80 58 C44 88 32 40 8 72 Z"
        />
      </svg>
      <span className={`relative drop-shadow-[0_7px_0_rgba(0,0,0,0.38)] ${wordClass}`}>{text}</span>
    </span>
  );
}

function ChickenDinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex rotate-[-8deg] flex-col items-center ${className}`}>
      <svg viewBox="0 0 64 36" className="mb-1 h-7 w-12 text-[#F2A900]" aria-hidden>
        <path fill="currentColor" d="M6 30 12 10 22 22 32 4 42 22 52 10 58 30 Z" />
        <path fill="currentColor" d="M8 30h48v5H8z" />
        <circle cx="12" cy="10" r="2.2" fill="#fff4c2" />
        <circle cx="32" cy="4" r="2.2" fill="#fff4c2" />
        <circle cx="52" cy="10" r="2.2" fill="#fff4c2" />
      </svg>
      <p className="script-face text-center text-[1.35rem] leading-[0.95] sm:text-[1.6rem]">
        Winner
        <br />
        Winner
        <br />
        Chicken Dinner!
      </p>
    </div>
  );
}

function PubgMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-[52px] w-[68px] items-center justify-center bg-[#F2A900] shadow-[0_10px_24px_rgba(0,0,0,0.4)] ${className}`} aria-hidden>
      <span className="font-brush text-[15px] leading-none tracking-tight text-[#16140c]">PUBG</span>
    </div>
  );
}
