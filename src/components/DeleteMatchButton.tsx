"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "삭제에 실패했습니다.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("삭제 요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="border border-red-400/50 px-3 py-1.5 text-sm text-red-200 hover:bg-red-950/40">
        삭제
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby={`delete-${matchId}`}>
          <div className="w-full max-w-md border-[3px] border-[#F2A900] bg-[#12161e] p-5">
            <h3 id={`delete-${matchId}`} className="text-lg font-black">
              이 매치를 삭제할까요?
            </h3>
            <p className="mt-2 text-sm text-white/75">삭제하면 누적 순위는 남은 경기만으로 다시 계산됩니다.</p>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={pending} className="border border-white/20 px-3 py-2 text-sm">
                취소
              </button>
              <button type="button" onClick={remove} disabled={pending} className="bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {pending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
