import { z } from 'zod';

/** The only place `import.meta.env` is read (mirrors CLAUDE.md §8 on the frontend). */
const envSchema = z.object({
  VITE_API_BASE_URL: z.url('VITE_API_BASE_URL must be a valid URL'),
});

export type Env = Readonly<z.infer<typeof envSchema>>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid frontend environment:\n  - ${issues.join('\n  - ')}`);
    this.name = 'EnvValidationError';
  }
}

/** Pure parser so the rules are unit-testable without touching the real env. */
export const parseEnv = (source: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
    );
  }

  return Object.freeze(result.data);
};

export const env: Env = parseEnv({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
});
