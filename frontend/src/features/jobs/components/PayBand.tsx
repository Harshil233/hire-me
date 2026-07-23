import type { PayScale } from '../utils/pay-scale';

export interface PayBandProps {
  readonly ctcMin?: number | undefined;
  readonly ctcMax?: number | undefined;
  readonly scale: PayScale;
  /** Read out to assistive tech, which cannot see the track. */
  readonly label: string;
}

/**
 * Where this role's pay sits against every role on the page.
 *
 * A job listing is not prose, it is a set of ranges — so the range is drawn as a
 * range. Scanning the list you can see which roles pay more without reading a single
 * figure, which is the one thing a list of jobs exists to help you do.
 *
 * Hidden from assistive tech as a graphic; the figures beside it carry the same
 * information in text.
 */
export const PayBand = ({
  ctcMin,
  ctcMax,
  scale,
  label,
}: PayBandProps): React.JSX.Element | null => {
  const span = scale.max - scale.min;

  // Nothing to compare against, or nothing disclosed: draw no track at all rather
  // than an arbitrary one.
  if (span <= 0 || (ctcMin === undefined && ctcMax === undefined)) {
    return null;
  }

  const low = ctcMin ?? scale.min;
  const high = ctcMax ?? scale.max;

  const clamp = (value: number): number => Math.min(Math.max(value, 0), 100);
  const start = clamp(((low - scale.min) / span) * 100);
  const end = clamp(((high - scale.min) / span) * 100);
  // Always wide enough to see, even when the range is a single figure.
  const width = Math.max(end - start, 2.5);

  return (
    <div
      role="img"
      aria-label={label}
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-border"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 rounded-full bg-accent"
        style={{ left: `${String(start)}%`, width: `${String(width)}%` }}
      />
    </div>
  );
};
