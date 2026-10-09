import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth";
import { deleteMatch } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "매치를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const deleted = await deleteMatch(id);
    if (!deleted) return NextResponse.json({ error: "매치를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    console.error("delete match failed");
    return NextResponse.json({ error: "매치를 삭제하지 못했습니다." }, { status: 500 });
  }
}
