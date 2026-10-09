import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth";
import { getRosterForm, RosterSaveError, saveRoster } from "@/lib/db";
import { normalizeRosterEntries } from "@/lib/teams";

export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;

  try {
    return NextResponse.json(await getRosterForm());
  } catch (error) {
    console.error("roster read failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "팀 명단을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "팀 명단 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const teams = body && typeof body === "object" ? (body as { teams?: unknown }).teams : undefined;
  const parsed = normalizeRosterEntries(teams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await saveRoster(parsed.entries));
  } catch (error) {
    if (error instanceof RosterSaveError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("roster save failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "팀 명단을 저장하지 못했습니다." }, { status: 500 });
  }
}
