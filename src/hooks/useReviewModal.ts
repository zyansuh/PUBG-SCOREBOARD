"use client";

import { useMemo, useState } from "react";
import { suggestTeams, type AnalyzedTeam, type TeamOption } from "@/lib/teams";
import { issueMessages, inspectRows, parseDraftFields } from "@/lib/validation";

type Draft = {
  key: string;
  name: string;
  rank: string;
  kills: string;
  resolution: "unset" | "new" | "merge";
  teamId: string;
};

export function useReviewModal(
  imageHash: string,
  initialTeams: AnalyzedTeam[],
  existingTeams: TeamOption[],
  onConfirmed: () => void,
) {
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

  function addRow() {
    setRows((current) => [...current, createDraft(emptyExtract(), existingTeams)]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((item) => item.key !== key));
  }

  return {
    rows,
    playedAt,
    setPlayedAt,
    submitting,
    error,
    parsed,
    issues,
    messages,
    choiceMissing,
    blocked,
    updateRow,
    confirm,
    addRow,
    removeRow,
  };
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
