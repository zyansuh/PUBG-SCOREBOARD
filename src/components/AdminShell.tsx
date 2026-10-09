"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "순위표" },
  { href: "/admin/upload", label: "업로드" },
  { href: "/admin/matches", label: "매치 기록" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[#07090d]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(242,169,0,0.16),transparent_42%),linear-gradient(180deg,#121820,#07090d)]" aria-hidden />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-[#F2A900]/30 pb-4">
          <Link href="/" className="mr-2 font-brush text-2xl text-[#FFC800]">
            배그 OPSN
          </Link>
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-sm font-bold ${active ? "bg-[#F2A900] text-black" : "text-white/80 hover:text-[#FFC800]"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <button type="button" onClick={logout} className="ml-auto px-3 py-1.5 text-sm text-white/70 hover:text-white">
            로그아웃
          </button>
        </nav>
        {children}
      </div>
    </div>
  );
}
