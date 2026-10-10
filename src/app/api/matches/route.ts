import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth";
import { createMatch, DuplicateMatchError, DuplicateTeamNameError, listTeamOptions, TeamNotFoundError } from "@/lib/db";
import { validateSubmission } from "@/lib/validation";

export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청을 해석하지 못했습니다." }, { status: 400 });
  }

  try {
    const existingTeams = await listTeamOptions();
    const parsed = validateSubmission(body, existingTeams);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const match = await createMatch({
      imageHash: parsed.imageHash,
      playedAt: parsed.playedAt,
      teams: parsed.teams,
    });
    return NextResponse.json({ ok: true, matchId: match.id, teamCount: parsed.teams.length });
  } catch (error) {
    if (error instanceof DuplicateMatchError) {
      const manual = body && typeof body === "object" && (body as { entry?: unknown }).entry === "manual";
      return NextResponse.json(
        { error: manual ? "이 직접 입력은 이미 반영되었습니다." : error.message },
        { status: 409 },
      );
    }
    if (error instanceof DuplicateTeamNameError || error instanceof TeamNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("confirm failed");
    return NextResponse.json({ error: "경기 반영에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
