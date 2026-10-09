import { connection } from "next/server";
import { UploadWorkspace } from "@/components/UploadWorkspace";
import { getRosterForm, type RosterForm } from "@/lib/db";

export default async function UploadPage() {
  await connection();
  let roster: RosterForm = {
    persisted: false,
    slots: Array.from({ length: 10 }, (_, index) => ({ slot: index + 1, id: null, name: "" })),
  };
  let dbError = false;

  try {
    roster = await getRosterForm();
  } catch (error) {
    console.error("roster page failed", error instanceof Error ? error.message : "unknown");
    dbError = true;
  }

  return (
    <section>
      <h1 className="text-2xl font-black">매치 결과 업로드</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
        참가 팀을 10칸까지 저장한 뒤 결과 스크린샷을 올리면, 그 팀의 순위와 킬로 점수를 계산합니다.
      </p>
      {dbError ? (
        <p role="alert" className="mt-4 border border-red-500/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          팀 명단을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.
        </p>
      ) : (
        <div className="mt-6">
          <UploadWorkspace initialRoster={roster} />
        </div>
      )}
    </section>
  );
}
