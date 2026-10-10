"use client";

import { formatSize, useUploadForm } from "@/hooks/useUploadForm";
import { ReviewModal } from "./ReviewModal";

export function UploadForm({ ready }: { ready: boolean }) {
  const { file, previewUrl, dragging, setDragging, analyzing, secondsLeft, error, success, review, selectFile, analyze, closeReview, confirmReview } =
    useUploadForm();

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

      {!ready ? (
        <p className="mt-4 text-sm text-[#FFE08A]">팀 이름을 저장한 뒤에 사진을 분석할 수 있습니다.</p>
      ) : null}

      <button
        type="button"
        onClick={analyze}
        disabled={!file || analyzing || !ready}
        className="mt-4 bg-[#F2A900] px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {analyzing ? "스크린샷을 분석하고 있습니다..." : "분석하기"}
      </button>
      {analyzing ? (
        <p className="mt-2 text-sm text-white/70">
          전장 기록을 읽고 있습니다. 10초 안에 마칩니다.
          {secondsLeft === null ? "" : ` 남은 시간 ${secondsLeft}초`}
        </p>
      ) : null}

      {review ? (
        <ReviewModal
          imageHash={review.imageHash}
          initialTeams={review.teams}
          existingTeams={review.existingTeams}
          onClose={closeReview}
          onConfirmed={confirmReview}
        />
      ) : null}
    </div>
  );
}
