"use client";

import { useState } from "react";
import type { ExtractedTeam } from "@/lib/extract";
import type { TeamOption } from "@/lib/teams";
import { ReviewModal } from "./ReviewModal";

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [review, setReview] = useState<{ imageHash: string; teams: ExtractedTeam[]; existingTeams: TeamOption[] } | null>(null);

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
        | { error?: string; imageHash?: string; teams?: ExtractedTeam[]; existingTeams?: TeamOption[] }
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

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`block cursor-pointer border-2 border-dashed px-4 py-10 text-center ${dragging ? "border-[#FFC800] bg-[#F2A900]/10" : "border-[#F2A900]/70 bg-black/40"}`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            selectFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        <p className="text-lg font-black">스크린샷을 끌어다 놓거나 클릭해서 선택</p>
        <p className="mt-2 text-sm text-white/65">JPG, PNG, WEBP · 최대 10MB · 순위, 팀명, 킬이 보이게 찍어 주세요.</p>
      </label>

      {previewUrl && file ? (
        <div className="mt-4 flex items-center gap-4 border border-white/10 bg-black/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="업로드한 매치 결과 미리보기" className="h-24 w-40 object-cover" />
          <div className="min-w-0">
            <p className="truncate font-bold">{file.name}</p>
            <p className="text-sm text-white/60">{formatSize(file.size)}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 border border-[#F2A900]/70 bg-[#F2A900]/10 px-3 py-2 text-sm text-[#FFE08A]">{success}</p>
      ) : null}

      <button
        type="button"
        onClick={analyze}
        disabled={!file || analyzing}
        className="mt-4 bg-[#F2A900] px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzing ? "스크린샷을 분석하고 있습니다..." : "분석하기"}
      </button>
      {analyzing ? <p className="mt-2 text-sm text-white/70">전장 기록을 읽고 있습니다. 잠시만 기다려 주세요.</p> : null}

      {review ? (
        <ReviewModal
          imageHash={review.imageHash}
          initialTeams={review.teams}
          existingTeams={review.existingTeams}
          onClose={() => setReview(null)}
          onConfirmed={() => {
            setReview(null);
            setFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setSuccess("매치가 반영되었습니다. 순위표에서 누적 점수를 확인하세요.");
          }}
        />
      ) : null}
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
