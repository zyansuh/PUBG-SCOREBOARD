export function fieldClass(invalid: boolean) {
  return `mt-1 w-full border px-3 py-2 font-medium outline-none ${invalid ? "border-red-500 bg-red-950/50 text-red-100" : "border-white/15 bg-black/40"}`;
}
