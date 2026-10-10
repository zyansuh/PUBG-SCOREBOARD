import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth";
import { findMatchByHash, listSlottedTeams, listTeamOptions } from "@/lib/db";
import { ExtractError } from "@/lib/extract";
import { detectImageMime, MAX_IMAGE_BYTES, sha256Hex } from "@/lib/image";
import { readMatchRows } from "@/lib/ocr-rows";
import { assignExtractedTeams } from "@/lib/teams";

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

  console.info("[사진 분석] 사진을 받았습니다.", { name: file.name, bytes: file.size });
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

    const ocrText = form.get("ocrText");
    if (typeof ocrText !== "string" || !ocrText.trim() || ocrText.length > 100_000) {
      throw new ExtractError("사진에서 글자를 읽지 못했습니다. 순위, 팀명, 킬이 보이는 이미지로 다시 올려 주세요.");
    }

    const roster = await listSlottedTeams();
    const extracted = readMatchRows(
      ocrText,
      roster.map((team) => ({ slot: team.slot, name: team.name })),
    );
    if (extracted.length === 0) {
      throw new ExtractError("사진에서 #1 팀 7 같은 순위와 팀 번호를 찾지 못했습니다. 순위, 팀 번호, 킬이 보이게 찍어 주세요.");
    }
    const teams = assignExtractedTeams(extracted, roster);
    const existingTeams = await listTeamOptions();
    console.info("[사진 분석] 확인 창에 보낼 결과를 만들었습니다.", { teams: teams.length });
    return NextResponse.json({ imageHash, teams, existingTeams });
  } catch (error) {
    if (error instanceof ExtractError) {
      console.info("[사진 분석] 사진을 해석하지 못했습니다.", error.message);
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[사진 분석] 분석 중 오류가 났습니다.", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "이미지에서 결과를 읽지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
