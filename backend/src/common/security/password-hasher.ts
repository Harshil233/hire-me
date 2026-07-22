import bcrypt from 'bcryptjs';

/** Hashing port — keeps bcrypt out of services (CLAUDE.md §4, Adapter). */
export interface IPasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly rounds: number) {}

  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.rounds);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
