"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function useLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.replace(readNextPath());
      router.refresh();
    } catch {
      setError("로그인 요청에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return { password, setPassword, error, pending, onSubmit };
}

function readNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/admin") && !next.startsWith("//") && next !== "/admin/login") return next;
  return "/admin/upload";
}
