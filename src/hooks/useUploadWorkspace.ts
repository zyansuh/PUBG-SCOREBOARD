"use client";

import { useState } from "react";
import type { RosterForm, RosterSlot } from "@/components/match/TeamRoster";

export function useUploadWorkspace(initialRoster: RosterForm) {
  const [ready, setReady] = useState(() => initialRoster.persisted && initialRoster.slots.some((slot) => slot.name.trim().length > 0));
  const [slots, setSlots] = useState<RosterSlot[]>(initialRoster.slots);

  function onRosterStatus({ saved, dirty, slots: next }: { saved: boolean; dirty: boolean; slots: RosterSlot[] }) {
    setReady(saved);
    if (!dirty) setSlots(next);
  }

  return { ready, slots, onRosterStatus };
}
