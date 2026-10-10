"use client";

import { useState } from "react";
import type { AnalyzedTeam, TeamOption } from "@/lib/teams";

const MAX_BYTES = 10 * 1024 * 1024;

type ReviewState = {
  imageHash: string;
  teams: AnalyzedTeam[];
  existingTeams: TeamOption[];
};

export function useUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [review, setReview] = useState<ReviewState | null>(null);

  function selectFile(next: File | null) {
    setError("");
    setSuccess("");
    setReview(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setFile(null);
      setPreviewUrl(null);
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setError("");
    setSuccess("");
    try {
      const body = new FormData();
      body.set("image", file);
      const response = await fetch("/api/analyze", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; imageHash?: string; teams?: AnalyzedTeam[]; existingTeams?: TeamOption[] }
        | null;
      if (!response.ok || !payload?.imageHash || !payload.teams || !payload.existingTeams) {
        setError(payload?.error ?? "이미지 분석에 실패했습니다.");
        return;
      }
      setReview({ imageHash: payload.imageHash, teams: payload.teams, existingTeams: payload.existingTeams });
    } catch {
      setError("업로드 요청에 실패했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setAnalyzing(false);
    }
  }

  function closeReview() {
    setReview(null);
  }

  function confirmReview() {
    setReview(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSuccess("매치가 반영되었습니다. 순위표에서 누적 점수를 확인하세요.");
  }

  return {
    file,
    previewUrl,
    dragging,
    setDragging,
    analyzing,
    error,
    success,
    review,
    selectFile,
    analyze,
    closeReview,
    confirmReview,
  };
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
