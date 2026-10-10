"use client";

import { usePathname, useRouter } from "next/navigation";

export function useAdminShell() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return { pathname, logout };
}
