"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function useDeleteMatch(matchId: string) {
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

  return { open, setOpen, pending, error, remove };
}
