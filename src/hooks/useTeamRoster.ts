"use client";

import { useState } from "react";
import type { RosterEntry } from "@/lib/teams";
import type { RosterForm, RosterSlot, RosterStatus } from "@/components/match/TeamRoster";

export function useTeamRoster(initialRoster: RosterForm, onStatus: (status: RosterStatus) => void) {
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
    onStatus({ saved: persisted && !dirty, dirty, slots: next });
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
      setMessage("팀 명단을 저장했습니다. 직접 입력하거나 스크린샷으로 이 팀의 점수를 계산할 수 있습니다.");
      onStatus({ saved: true, dirty: false, slots: payload.slots });
    } catch {
      setError("팀 명단 저장에 실패했습니다. 네트워크를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return { slots, saving, error, message, updateName, save };
}

function toEntry(slot: RosterSlot): RosterEntry & { slot: number } {
  return { slot: slot.slot, id: slot.id, name: slot.name };
}
