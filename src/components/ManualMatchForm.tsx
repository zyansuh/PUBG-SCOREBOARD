"use client";

import { useEffect, useState } from "react";
import { formatSigned, previewScore } from "@/lib/scoring";
import { issueMessages, inspectRows, parseDraftFields } from "@/lib/validation";
import type { RosterSlot } from "./TeamRoster";

type Draft = { rank: string; kills: string };

export function ManualMatchForm({ ready, slots }: { ready: boolean; slots: RosterSlot[] }) {
  const teams = slots.filter((slot): slot is RosterSlot & { id: string } => Boolean(slot.id && slot.name.trim()));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [playedAt, setPlayedAt] = useState("");

  useEffect(() => {
    setPlayedAt(toDatetimeLocal(new Date()));
  }, []);
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const touched = teams
    .map((team) => ({ team, draft: drafts[team.id] ?? { rank: "", kills: "" } }))
    .filter((row) => row.draft.rank.trim() !== "" || row.draft.kills.trim() !== "");
  const parsed = touched.map((row) => parseDraftFields({ name: row.team.name, rank: row.draft.rank, kills: row.draft.kills }));
  const messages = issueMessages(inspectRows(parsed));
  const blocked = !ready || submitting || touched.length === 0 || messages.length > 0 || !playedAt;

  function updateDraft(teamId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [teamId]: { rank: current[teamId]?.rank ?? "", kills: current[teamId]?.kills ?? "", ...patch },
    }));
    setError("");
    setSuccess("");
  }

  async function confirm() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const imageHash = await sha256Hex(`manual:${submissionKey}`);
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: "manual",
          imageHash,
          playedAt: new Date(playedAt).toISOString(),
          teams: touched.map((row) => ({
            name: row.team.name,
            rank: Number(row.draft.rank),
            kills: Number(row.draft.kills),
            teamId: row.team.id,
            resolution: "merge",
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "반영에 실패했습니다.");
        return;
      }
      setDrafts({});
      setSubmissionKey(crypto.randomUUID());
      setSuccess("직접 입력한 경기가 반영되었습니다. 순위표에서 누적 점수를 확인하세요.");
    } catch {
      setError("반영 요청에 실패했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-black">직접 입력</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-white/65">
        팀 번호는 위의 TEAM 칸 번호입니다. 경기 순위는 그 경기에서 몇 등인지이고, 둘은 다른 값입니다. 예를 들어 TEAM 3이 1위일 수 있습니다.
      </p>

      {!ready ? <p className="mt-4 text-sm text-[#FFE08A]">팀 이름을 저장한 뒤에 직접 입력할 수 있습니다.</p> : null}
      {ready && teams.length === 0 ? <p className="mt-4 text-sm text-[#FFE08A]">저장된 팀 이름이 없습니다.</p> : null}

      {teams.length > 0 ? (
        <div className="mt-4 space-y-3">
          <label className="block max-w-xs text-sm font-bold" htmlFor="manual-played-at">
            경기 일시
            <input
              id="manual-played-at"
              type="datetime-local"
              value={playedAt}
              onChange={(event) => setPlayedAt(event.target.value)}
              className="mt-1 w-full border border-white/15 bg-black/40 px-3 py-2 font-medium"
            />
          </label>

          {messages.length > 0 ? (
            <div role="alert" className="border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            {teams.map((team) => {
              const draft = drafts[team.id] ?? { rank: "", kills: "" };
              const fields = parseDraftFields({ name: team.name, rank: draft.rank, kills: draft.kills });
              const score = previewScore(fields.rank, fields.kills);
              return (
                <article key={team.id} className="border border-[#F2A900]/70 bg-black/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="bg-[#F2A900] px-2 py-1 text-xs font-black text-black">TEAM {team.slot}</p>
                    <p className="min-w-0 truncate text-sm font-bold">{team.name}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-white/70">
                      경기 순위
                      <input
                        inputMode="numeric"
                        value={draft.rank}
                        onChange={(event) => updateDraft(team.id, { rank: event.target.value })}
                        placeholder="예: 1"
                        className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-sm font-medium"
                      />
                    </label>
                    <label className="text-xs font-bold text-white/70">
                      킬
                      <input
                        inputMode="numeric"
                        value={draft.kills}
                        onChange={(event) => updateDraft(team.id, { kills: event.target.value })}
                        placeholder="예: 3"
                        className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-sm font-medium"
                      />
                    </label>
                  </div>
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
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {success ? <p className="mt-4 border border-[#F2A900]/70 bg-[#F2A900]/10 px-3 py-2 text-sm text-[#FFE08A]">{success}</p> : null}

      <button
        type="button"
        onClick={confirm}
        disabled={blocked}
        className="mt-4 bg-[#F2A900] px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "반영 중..." : "직접 입력 반영"}
      </button>
    </section>
  );
}

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
