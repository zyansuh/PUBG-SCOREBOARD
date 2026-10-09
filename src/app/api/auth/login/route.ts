import { NextResponse } from "next/server";
import { passwordsMatch, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth-token";

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD가 설정되지 않았습니다." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const password = body && typeof body === "object" && "password" in body ? (body as { password?: unknown }).password : null;
  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return NextResponse.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
  }
  if (!passwordsMatch(password, expected)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(expected), sessionCookieOptions);
  return response;
}
