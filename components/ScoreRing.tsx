import type { Priority } from "@/lib/types";
import { PRIORITY_STYLE } from "@/components/priority";

const R = 42;
const CIRC = 2 * Math.PI * R;

export default function ScoreRing({
  score,
  priority,
  size = 96,
  compact = false,
}: {
  score: number;
  priority: Priority;
  size?: number;
  compact?: boolean;
}) {
  const pct = Math.min(10, Math.max(0, score)) / 10;
  return (
    <div
      role="img"
      aria-label={`Score ${score} out of 10`}
      className={`relative shrink-0 ${PRIORITY_STYLE[priority].text}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth={compact ? 9 : 8} className="stroke-line" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth={compact ? 9 : 8}
          strokeLinecap="round"
          className="stroke-current"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-ink">
        {compact ? (
          <span className="text-sm font-semibold tabular-nums">{score}</span>
        ) : (
          <span className="flex items-baseline leading-none">
            <span className="text-3xl font-semibold tabular-nums">{score}</span>
            <span className="text-sm text-muted">/10</span>
          </span>
        )}
      </div>
    </div>
  );
}
