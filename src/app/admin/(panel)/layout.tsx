import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { isAdminRequest } from "@/lib/auth";

async function Guard({ children }: { children: React.ReactNode }) {
  await connection();
  const ok = await isAdminRequest();
  if (!ok) redirect("/admin/login");
  return <AdminShell>{children}</AdminShell>;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#07090d] text-sm text-white/70">권한을 확인하고 있습니다...</div>}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
