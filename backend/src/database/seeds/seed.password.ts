/**
 * Demo data for a local or staging database. Every account shares one password so the
 * environment is easy to explore; it satisfies the real password policy, and nothing
 * here is a production credential — the accounts exist only where this seed is run.
 *
 * The runner refuses to execute when `NODE_ENV` is production, because a shared,
 * committed password would otherwise become a real one.
 */
export const SEED_PASSWORD = 'Demo@1234';
