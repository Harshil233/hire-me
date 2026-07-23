export interface JobBulletSectionProps {
  readonly title: string;
  readonly items: readonly string[];
}

/**
 * One headed list of a job description. Renders nothing when the employer left the
 * section out, so a short posting reads as short rather than as a page of empty headings.
 */
export const JobBulletSection = ({
  title,
  items,
}: JobBulletSectionProps): React.JSX.Element | null => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>

      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-fg-muted">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
