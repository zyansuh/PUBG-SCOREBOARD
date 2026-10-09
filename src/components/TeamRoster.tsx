"use client";

import { useState } from "react";
import type { RosterEntry } from "@/lib/teams";

export type RosterSlot = {
  slot: number;
  id: string | null;
  name: string;
};

export type RosterForm = {
  persisted: boolean;
  slots: RosterSlot[];
};

export function TeamRoster({
  initialRoster,
  onStatus,
}: {
  initialRoster: RosterForm;
  onStatus: (status: { saved: boolean; dirty: boolean }) => void;
}) {
  const [slots, setSlots] = useState<Array<RosterEntry & { slot: number }>>(() => initialRoster.slots.map(toEntry));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialRoster.slots.map(toEntry)));
  const [persisted, setPersisted] = useState(initialRoster.persisted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateName(index: number, name: string) {
    const next = slots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, name } : slot));
    setSlots(next);
    const dirty = JSON.stringify(next) !== savedSnapshot;
    onStatus({ saved: persisted && !dirty, dirty });
    setError("");
    setMessage("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: slots }),
      });
      const payload = (await response.json().catch(() => null)) as (RosterForm & { error?: string }) | null;
      if (!response.ok || !payload?.slots) {
        setError(payload?.error ?? "팀 명단을 저장하지 못했습니다.");
        return;
      }
      const next = payload.slots.map(toEntry);
      setSlots(next);
      setSavedSnapshot(JSON.stringify(next));
      setPersisted(true);
      setMessage("팀 명단을 저장했습니다. 스크린샷의 순위와 킬을 이 팀에 맞춰 계산합니다.");
      onStatus({ saved: true, dirty: false });
    } catch {
      setError("팀 명단 저장에 실패했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-black">참가 팀</h2>
      <p className="mt-1 text-sm text-white/65">TEAM 1부터 순서대로 이름을 적고 저장하세요. 최대 10팀입니다.</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {slots.map((slot, index) => (
          <li key={slot.slot ?? index} className="border border-[#F2A900]/80 bg-black/40">
            <p className="bg-[#F2A900] px-3 py-1 text-xs font-black tracking-wide text-black">TEAM {index + 1}</p>
            <label className="block px-3 py-3 text-xs font-bold text-white/60">
              팀 이름
              <input
                value={slot.name}
                maxLength={40}
                onChange={(event) => updateName(index, event.target.value)}
                placeholder="팀 이름"
                className="mt-1 w-full border border-white/15 bg-black/50 px-3 py-2 text-sm font-medium text-white outline-none placeholder:text-white/30"
              />
            </label>
          </li>
        ))}
      </ol>
      {error ? (
        <p role="alert" className="mt-4 border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? <p className="mt-4 border border-[#F2A900]/70 bg-[#F2A900]/10 px-3 py-2 text-sm text-[#FFE08A]">{message}</p> : null}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 bg-[#F2A900] px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? "저장 중..." : "팀 명단 저장"}
      </button>
    </section>
  );
}

function toEntry(slot: RosterSlot): RosterEntry & { slot: number } {
  return { slot: slot.slot, id: slot.id, name: slot.name };
}
