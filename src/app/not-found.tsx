import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07090d] px-4 text-center">
      <div>
        <h1 className="font-brush text-5xl text-[#FFC800]">404</h1>
        <p className="mt-3">페이지를 찾을 수 없습니다.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-[#FFC800] underline">
          순위표로 돌아가기
        </Link>
      </div>
    </main>
  );
}
