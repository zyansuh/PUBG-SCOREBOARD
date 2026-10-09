import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <section>
      <h1 className="text-2xl font-black">매치 결과 업로드</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
        PUBG 매치 결과 스크린샷을 올리면 서버가 팀명, 순위, 킬을 읽습니다. 점수는 AI가 계산하지 않고, 확인 화면에서 고친 뒤 확정할 때 서버 규칙으로 계산해 누적합니다.
      </p>
      <div className="mt-6">
        <UploadForm />
      </div>
    </section>
  );
}
