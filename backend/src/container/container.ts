import type { Token } from './token';

/** Raised when the composition root forgot to register a dependency. */
export class DependencyNotRegisteredError extends Error {
  constructor(description: string) {
    super(`No provider registered for token "${description}"`);
    this.name = 'DependencyNotRegisteredError';
  }
}

/**
 * Minimal typed registry used only by the composition root and route wiring.
 * Classes never reach into it — they receive dependencies through constructors.
 */
export class Container {
  private readonly providers = new Map<symbol, unknown>();

  register<TValue>(token: Token<TValue>, value: TValue): this {
    this.providers.set(token.key, value);
    return this;
  }

  resolve<TValue>(token: Token<TValue>): TValue {
    if (!this.providers.has(token.key)) {
      throw new DependencyNotRegisteredError(token.description);
    }
    return this.providers.get(token.key) as TValue;
  }
}
