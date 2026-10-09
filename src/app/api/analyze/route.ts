import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth";
import { findMatchByHash, listTeamOptions } from "@/lib/db";
import { ExtractError } from "@/lib/extract";
import { detectImageMime, MAX_IMAGE_BYTES, sha256Hex } from "@/lib/image";
import { AnalysisError, ConfigError, extractTeamsFromImage } from "@/lib/openai";

export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "업로드를 읽지 못했습니다. 10MB 이하의 이미지인지 확인해 주세요." },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일을 선택해 주세요." }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "빈 파일입니다." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다." }, { status: 415 });
  }

  try {
    const imageHash = sha256Hex(bytes);
    const duplicate = await findMatchByHash(imageHash);
    if (duplicate) {
      return NextResponse.json(
        { error: "이미 반영된 스크린샷입니다. 같은 이미지는 한 번만 등록할 수 있습니다." },
        { status: 409 },
      );
    }

    const teams = await extractTeamsFromImage(bytes, mime);
    const existingTeams = await listTeamOptions();
    return NextResponse.json({ imageHash, teams, existingTeams });
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof ExtractError || error instanceof AnalysisError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof ExtractError ? 422 : 502 });
    }
    console.error("analyze failed");
    return NextResponse.json({ error: "이미지 분석에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
