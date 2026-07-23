export interface CompletionRingProps {
  readonly percentage: number;
  readonly size?: number;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const toneFor = (percentage: number): string => {
  if (percentage >= 80) {
    return 'text-emerald-500';
  }
  return percentage >= 40 ? 'text-amber-500' : 'text-danger';
};

/** Circular progress indicator for profile completion. */
export const CompletionRing = ({
  percentage,
  size = 96,
}: CompletionRingProps): React.JSX.Element => {
  const safe = Math.min(Math.max(Math.round(percentage), 0), 100);
  const offset = CIRCUMFERENCE - (safe / 100) * CIRCUMFERENCE;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Profile ${safe}% complete`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`${toneFor(safe)} stroke-current transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <span className="absolute text-lg font-semibold text-fg">{safe}%</span>
    </div>
  );
};
