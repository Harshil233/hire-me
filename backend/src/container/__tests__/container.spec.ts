import { describe, expect, it } from 'vitest';

import { Container, DependencyNotRegisteredError } from '../container';
import { createToken } from '../token';

interface Greeter {
  greet(): string;
}

const GREETER = createToken<Greeter>('IGreeter');
const OTHER = createToken<Greeter>('IOtherGreeter');

describe('Container', () => {
  it('resolves a registered value with its declared type', () => {
    const container = new Container().register(GREETER, { greet: () => 'hello' });

    expect(container.resolve(GREETER).greet()).toBe('hello');
  });

  it('supports chained registration', () => {
    const container = new Container()
      .register(GREETER, { greet: () => 'a' })
      .register(OTHER, { greet: () => 'b' });

    expect(container.resolve(OTHER).greet()).toBe('b');
  });

  it('keeps tokens with the same description distinct', () => {
    const first = createToken<Greeter>('IGreeter');
    const second = createToken<Greeter>('IGreeter');
    const container = new Container().register(first, { greet: () => 'first' });

    expect(container.resolve(first).greet()).toBe('first');
    expect(() => container.resolve(second)).toThrow(DependencyNotRegisteredError);
  });

  it('replaces a previous registration', () => {
    const container = new Container()
      .register(GREETER, { greet: () => 'old' })
      .register(GREETER, { greet: () => 'new' });

    expect(container.resolve(GREETER).greet()).toBe('new');
  });

  it('throws a descriptive error for a missing dependency', () => {
    expect(() => new Container().resolve(GREETER)).toThrow(DependencyNotRegisteredError);
    expect(() => new Container().resolve(GREETER)).toThrow(/IGreeter/);
  });

  it('resolves a token only once it has been registered', () => {
    const container = new Container();

    expect(() => container.resolve(GREETER)).toThrow(DependencyNotRegisteredError);
    container.register(GREETER, { greet: () => 'hi' });
    expect(container.resolve(GREETER).greet()).toBe('hi');
  });
});
