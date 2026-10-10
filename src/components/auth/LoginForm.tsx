"use client";

import { useLoginForm } from "@/hooks/useLoginForm";

export function LoginForm() {
  const { password, setPassword, error, pending, onSubmit } = useLoginForm();

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md border-[3px] border-[#F2A900] bg-black/75 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-8">
      <p className="text-center text-[11px] tracking-[0.28em] text-white/60">ADMIN</p>
      <h1 className="mt-2 text-center font-brush text-4xl text-[#FFC800]">배그 OPSN</h1>
      <p className="mt-2 text-center text-sm text-white/75">관리자 비밀번호를 입력해 주세요.</p>
      <label className="mt-6 block text-sm font-bold" htmlFor="password">
        비밀번호
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full border border-white/15 bg-black/50 px-3 py-3 text-white outline-none focus:border-[#F2A900]"
      />
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="mt-5 w-full bg-[#F2A900] py-3 text-sm font-black text-black hover:bg-[#FFC800] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
