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
          저장한 팀 이름으로 스크린샷의 순위와 킬을 맞춥니다. 확인 화면의 점수는 서버 규칙으로 계산되고, 확정해야 순위표에 누적됩니다.
        </p>
        <div className="mt-4">
          <UploadForm ready={ready} />
        </div>
      </section>
    </div>
  );
}
