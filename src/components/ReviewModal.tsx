"use client";

import { useMemo, useState } from "react";
import { previewScore } from "@/lib/scoring";
import { formatSigned } from "@/lib/scoring";
import { nameSimilarity, suggestTeams, type AnalyzedTeam, type TeamOption } from "@/lib/teams";
import { issueMessages, inspectRows, parseDraftFields, rowHasIssues } from "@/lib/validation";

type Draft = {
  key: string;
  name: string;
  rank: string;
  kills: string;
  resolution: "unset" | "new" | "merge";
  teamId: string;
};

export function ReviewModal({
  imageHash,
  initialTeams,
  existingTeams,
  onClose,
  onConfirmed,
}: {
  imageHash: string;
  initialTeams: AnalyzedTeam[];
  existingTeams: TeamOption[];
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [rows, setRows] = useState<Draft[]>(() =>
    (initialTeams.length > 0 ? [...initialTeams].sort(byRank) : [emptyExtract()]).map((team) => createDraft(team, existingTeams)),
  );
  const [playedAt, setPlayedAt] = useState(() => toDatetimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const parsed = useMemo(() => rows.map((row) => parseDraftFields(row)), [rows]);
  const issues = useMemo(() => inspectRows(parsed), [parsed]);
  const messages = issueMessages(issues);
  const choiceMissing = rows.some((row, index) => {
    const suggestions = parsed[index]?.name ? suggestTeams(parsed[index].name, existingTeams) : [];
    if (suggestions.length === 0) return false;
    if (row.resolution === "unset") return true;
    return row.resolution === "merge" && !row.teamId;
  });
  const blocked = messages.length > 0 || choiceMissing || !playedAt || submitting;

  function updateRow(key: string, patch: Partial<Draft>) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.name === undefined) return next;
        const suggestions = next.name.trim() ? suggestTeams(next.name, existingTeams) : [];
        if (suggestions.length === 0) {
          next.resolution = "new";
          next.teamId = "";
        } else if (next.resolution === "new") {
          next.teamId = "";
        } else if (next.resolution === "merge" && existingTeams.some((team) => team.id === next.teamId)) {
          return next;
        } else if (suggestions.some((team) => team.similarity === 1)) {
          next.resolution = "merge";
          next.teamId = suggestions.find((team) => team.similarity === 1)?.id ?? "";
        } else {
          next.resolution = "unset";
          next.teamId = "";
        }
        return next;
      }),
    );
  }

  async function confirm() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageHash,
          playedAt: new Date(playedAt).toISOString(),
          teams: rows.map((row) => {
            const fields = parseDraftFields(row);
            const suggestions = fields.name ? suggestTeams(fields.name, existingTeams) : [];
            return {
              name: fields.name,
              rank: fields.rank,
              kills: fields.kills,
              teamId: row.resolution === "merge" ? row.teamId : null,
              resolution: suggestions.length === 0 ? "new" : row.resolution,
            };
          }),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "반영에 실패했습니다.");
        return;
      }
      onConfirmed();
    } catch {
      setError("반영 요청에 실패했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col border-[3px] border-[#F2A900] bg-[#10141b] shadow-2xl sm:max-h-[88vh]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <h2 id="review-title" className="text-xl font-black">
              인식 결과 확인
            </h2>
            <p className="mt-1 text-sm text-white/65">값을 고친 뒤 확정해야 순위에 반영됩니다. 예상 점수는 확정 시 서버에서 같은 규칙으로 다시 계산합니다.</p>
          </div>
          <button type="button" onClick={onClose} className="px-2 text-sm text-white/70 hover:text-white" disabled={submitting}>
            닫기
          </button>
        </div>

        <div className="overflow-auto px-4 py-4 sm:px-6">
          <label className="mb-4 block max-w-xs text-sm font-bold" htmlFor="played-at">
            경기 일시
            <input
              id="played-at"
              type="datetime-local"
              value={playedAt}
              onChange={(event) => setPlayedAt(event.target.value)}
              className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 font-medium"
            />
          </label>

          {messages.length > 0 || choiceMissing ? (
            <div role="alert" className="mb-4 border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
              {choiceMissing ? <p>비슷한 기존 팀이 있습니다. 합칠지 새 팀으로 둘지 선택해 주세요.</p> : null}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mb-4 border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="space-y-3">
            {rows.map((row, index) => {
              const fields = parsed[index];
              const rowIssues = issues[index];
              const suggestions = fields.name ? suggestTeams(fields.name, existingTeams) : [];
              const score = rowHasIssues(rowIssues) ? null : previewScore(fields.rank, fields.kills);
              const teamOptions = [...existingTeams].sort(
                (left, right) => nameSimilarity(row.name, right.name) - nameSimilarity(row.name, left.name) || left.name.localeCompare(right.name, "ko"),
              );
              return (
                <article key={row.key} className="border border-white/10 bg-black/30 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black text-[#FFC800]">{index + 1}행</p>
                    <button type="button" className="text-sm text-red-300 hover:text-red-200" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>
                      삭제
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_0.6fr]">
                    <label className="text-xs font-bold text-white/70">
                      팀명
                      <input
                        value={row.name}
                        onChange={(event) => updateRow(row.key, { name: event.target.value })}
                        className={fieldClass(rowIssues.name.length > 0)}
                        aria-invalid={rowIssues.name.length > 0}
                      />
                    </label>
                    <label className="text-xs font-bold text-white/70">
                      순위
                      <input
                        inputMode="numeric"
                        value={row.rank}
                        onChange={(event) => updateRow(row.key, { rank: event.target.value })}
                        className={fieldClass(rowIssues.rank.length > 0)}
                        aria-invalid={rowIssues.rank.length > 0}
                      />
                    </label>
                    <label className="text-xs font-bold text-white/70">
                      킬
                      <input
                        inputMode="numeric"
                        value={row.kills}
                        onChange={(event) => updateRow(row.key, { kills: event.target.value })}
                        className={fieldClass(rowIssues.kills.length > 0)}
                        aria-invalid={rowIssues.kills.length > 0}
                      />
                    </label>
                  </div>

                  {suggestions.length > 0 ? (
                    <fieldset className={`mt-3 border px-3 py-2 ${row.resolution === "unset" ? "border-red-500" : "border-[#F2A900]/70"}`}>
                      <legend className="px-1 text-xs font-bold text-[#FFC800]">비슷한 기존 팀</legend>
                      <p className="mb-2 text-xs text-white/70">
                        {suggestions.map((team) => `${team.name} (${Math.round(team.similarity * 100)}%)`).join(", ")}
                      </p>
                      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name={`resolution-${row.key}`}
                            checked={row.resolution === "new"}
                            onChange={() => updateRow(row.key, { resolution: "new", teamId: "" })}
                          />
                          새 팀으로 등록
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name={`resolution-${row.key}`}
                            checked={row.resolution === "merge"}
                            onChange={() => updateRow(row.key, { resolution: "merge" })}
                          />
                          기존 팀과 합치기
                        </label>
                        {row.resolution === "merge" ? (
                          <select
                            value={row.teamId}
                            onChange={(event) => updateRow(row.key, { teamId: event.target.value, resolution: "merge" })}
                            className="border border-white/15 bg-black px-2 py-1.5"
                          >
                            <option value="">팀을 선택하세요</option>
                            {teamOptions.map((team) => {
                              const similarity = nameSimilarity(row.name, team.name);
                              const hint = similarity >= 0.75 ? ` · ${Math.round(similarity * 100)}%` : "";
                              return (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                  {hint}
                                </option>
                              );
                            })}
                          </select>
                        ) : null}
                      </div>
                    </fieldset>
                  ) : null}

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-black/40 px-2 py-2">
                      <dt className="text-[11px] text-white/50">순위 점수</dt>
                      <dd className="font-bold">{score ? formatSigned(score.placementPoints) : "—"}</dd>
                    </div>
                    <div className="bg-black/40 px-2 py-2">
                      <dt className="text-[11px] text-white/50">킬 점수</dt>
                      <dd className="font-bold">{score ? formatSigned(score.killPoints) : "—"}</dd>
                    </div>
                    <div className="bg-black/40 px-2 py-2">
                      <dt className="text-[11px] text-white/50">합계</dt>
                      <dd className="text-lg font-black text-[#FFD000]">{score ? score.totalPoints : "—"}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 border border-dashed border-[#F2A900]/60 px-3 py-2 text-sm font-bold text-[#FFC800]"
            onClick={() => setRows((current) => [...current, createDraft(emptyExtract(), existingTeams)])}
          >
            팀 추가
          </button>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={submitting} className="border border-white/20 px-4 py-2.5 text-sm font-bold">
            취소
          </button>
          <button type="button" onClick={confirm} disabled={blocked} className="bg-[#F2A900] px-4 py-2.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40">
            {submitting ? "반영 중..." : "확정하고 반영"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fieldClass(invalid: boolean) {
  return `mt-1 w-full border px-3 py-2 font-medium outline-none ${invalid ? "border-red-500 bg-red-950/50 text-red-100" : "border-white/15 bg-black/40"}`;
}

function emptyExtract(): AnalyzedTeam {
  return { name: null, rank: null, kills: null, teamId: null };
}

function createDraft(team: AnalyzedTeam, existingTeams: TeamOption[]): Draft {
  const linked = team.teamId ? existingTeams.find((item) => item.id === team.teamId) : undefined;
  const name = linked?.name ?? team.name ?? "";
  const suggestions = name ? suggestTeams(name, existingTeams) : [];
  const exact = suggestions.find((item) => item.similarity === 1);
  return {
    key: crypto.randomUUID(),
    name,
    rank: team.rank === null ? "" : String(team.rank),
    kills: team.kills === null ? "" : String(team.kills),
    resolution: linked || exact ? "merge" : suggestions.length > 0 ? "unset" : "new",
    teamId: linked?.id ?? exact?.id ?? "",
  };
}

function byRank(left: AnalyzedTeam, right: AnalyzedTeam) {
  if (left.rank === null) return 1;
  if (right.rank === null) return -1;
  return left.rank - right.rank;
}

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
