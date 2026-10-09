const MEDALS = {
  1: ["#fff4c2", "#f2a900", "#8a5a00"],
  2: ["#ffffff", "#c5ccd6", "#5d6772"],
  3: ["#f8d7ba", "#c47a45", "#6a3a16"],
} as const;

export function RankBadge({ rank, idPrefix }: { rank: number; idPrefix: string }) {
  if (rank === 1 || rank === 2 || rank === 3) {
    const [light, mid, dark] = MEDALS[rank];
    const id = `${idPrefix}-medal-${rank}`;
    return (
      <svg viewBox="0 0 48 48" className="mx-auto h-10 w-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)]" aria-hidden>
        <defs>
          <radialGradient id={id} cx="32%" cy="28%" r="70%">
            <stop offset="0%" stopColor={light} />
            <stop offset="48%" stopColor={mid} />
            <stop offset="100%" stopColor={dark} />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="21" fill={`url(#${id})`} />
        <circle cx="24" cy="24" r="16.5" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.6" />
        <text x="24" y="30" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1a1204">
          {rank}
        </text>
      </svg>
    );
  }

  return (
    <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#12161e] text-sm font-black text-white ring-1 ring-white/15">
      {rank}
    </span>
  );
}
