"use client";

import { useEffect, useState } from "react";
import { issueMessages, inspectRows, parseDraftFields } from "@/lib/validation";
import type { RosterSlot } from "@/components/match/TeamRoster";

type Draft = { rank: string; kills: string };

export function useManualMatchForm(ready: boolean, slots: RosterSlot[]) {
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

  return { teams, drafts, playedAt, setPlayedAt, submitting, error, success, messages, blocked, updateDraft, confirm };
}

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
