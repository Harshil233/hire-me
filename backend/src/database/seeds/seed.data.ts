/**
 * Barrel for the demo dataset. The data is split by subject — employers, jobs,
 * candidates, applications — so no single file has to hold all of it, and the runner
 * still has one place to import from.
 */
export { SEED_PASSWORD } from './seed.password';
export { SEED_HRS } from './seed.employers';
export { SEED_JOBS } from './seed.jobs';
export { SEED_CANDIDATES } from './seed.candidates';
export { SEED_APPLICATIONS } from './seed.applications';
export type { SeedCandidateSections } from './seed.types';
