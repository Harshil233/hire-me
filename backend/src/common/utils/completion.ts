/** Profile-completion scoring, shared by every role's calculator. */

export interface CompletionRule<TSubject> {
  readonly key: string;
  readonly label: string;
  readonly weight: number;
  readonly isComplete: (subject: TSubject) => boolean;
}

export interface CompletionItem {
  readonly key: string;
  readonly label: string;
  readonly weight: number;
  readonly isComplete: boolean;
}

export interface ProfileCompletion {
  /** 0–100, rounded to the nearest whole percent. */
  readonly percentage: number;
  readonly completedWeight: number;
  readonly totalWeight: number;
  readonly items: readonly CompletionItem[];
  /** Convenience view for the "what's missing" checklist. */
  readonly missing: readonly CompletionItem[];
}

/**
 * Pure, deterministic scoring: percentage is derived on every read so it can never
 * drift from the stored profile.
 */
export const calculateCompletion = <TSubject>(
  rules: readonly CompletionRule<TSubject>[],
  subject: TSubject,
): ProfileCompletion => {
  const items: CompletionItem[] = rules.map((rule) => ({
    key: rule.key,
    label: rule.label,
    weight: rule.weight,
    isComplete: rule.isComplete(subject),
  }));

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items
    .filter((item) => item.isComplete)
    .reduce((sum, item) => sum + item.weight, 0);

  return {
    percentage: totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100),
    completedWeight,
    totalWeight,
    items,
    missing: items.filter((item) => !item.isComplete),
  };
};

/** A list counts as filled in only when it actually has entries. */
export const hasEntries = (value: readonly unknown[] | undefined): boolean =>
  value !== undefined && value.length > 0;

/** Treats empty strings as "not provided". */
export const isFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  return typeof value === 'string' ? value.trim().length > 0 : true;
};
