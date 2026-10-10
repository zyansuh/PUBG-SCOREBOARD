"use client";

import { useManualMatchForm } from "@/hooks/useManualMatchForm";
import { formatSigned, previewScore } from "@/lib/scoring";
import { parseDraftFields } from "@/lib/validation";
import type { RosterSlot } from "./TeamRoster";

export function ManualMatchForm({ ready, slots }: { ready: boolean; slots: RosterSlot[] }) {
  const { teams, drafts, playedAt, setPlayedAt, submitting, error, success, messages, blocked, updateDraft, confirm } =
    useManualMatchForm(ready, slots);

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
