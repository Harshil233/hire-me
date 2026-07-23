export interface PayScale {
  /** Lowest and highest pay across the listings currently on screen. */
  readonly min: number;
  readonly max: number;
}

/**
 * The pay range across a page of listings, used to put every band on one axis so the
 * cards are comparable to each other rather than to nothing.
 */
export const payScaleOf = (
  jobs: readonly { ctcMin?: number | undefined; ctcMax?: number | undefined }[],
): PayScale => {
  const figures = jobs.flatMap((job) =>
    [job.ctcMin, job.ctcMax].filter((value): value is number => value !== undefined),
  );

  if (figures.length === 0) {
    return { min: 0, max: 0 };
  }

  return { min: Math.min(...figures), max: Math.max(...figures) };
};
