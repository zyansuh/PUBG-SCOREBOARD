"use client";

import { useUploadWorkspace } from "@/hooks/useUploadWorkspace";
import { ManualMatchForm } from "./ManualMatchForm";
import { TeamRoster, type RosterForm } from "./TeamRoster";
import { UploadForm } from "./UploadForm";

export function UploadWorkspace({ initialRoster }: { initialRoster: RosterForm }) {
  const { ready, slots, onRosterStatus } = useUploadWorkspace(initialRoster);

  return (
    <div className="space-y-10">
      <TeamRoster initialRoster={initialRoster} onStatus={onRosterStatus} />
      <ManualMatchForm ready={ready} slots={slots} />
      <section>
        <h2 className="text-lg font-black">매치 스크린샷</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/65">
          사진의 TEAM 1은 위에서 저장한 TEAM 1과 연결됩니다. 그 칸의 순위와 킬로 점수를 계산하고, 확정해야 순위표에 누적됩니다.
        </p>
        <div className="mt-4">
          <UploadForm ready={ready} />
        </div>
      </section>
    </div>
  );
}
