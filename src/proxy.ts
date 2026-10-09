import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isAdmin = await verifySessionToken(token, process.env.ADMIN_PASSWORD);

  if (pathname === "/admin/login") {
    if (isAdmin) return NextResponse.redirect(new URL("/admin/upload", request.url));
    return NextResponse.next();
  }

  if (isAdmin) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/analyze", "/api/matches", "/api/matches/:path*"],
};
