import type { SeedApplication } from './seed.types';

/**
 * Applications across the pool, including every outcome an employer can produce, so the
 * applicant list and the candidate's own tracker both have something to show.
 */
export const SEED_APPLICATIONS: readonly SeedApplication[] = [
  {
    candidateEmail: 'ada@example.com',
    jobTitle: 'Senior Backend Engineer',
    coverNote:
      'I have spent the last four years on TypeScript services backed by MongoDB, most recently owning a payments API end to end. The part of this role I am keenest on is the data modelling.',
    outcome: 'shortlisted',
  },
  {
    candidateEmail: 'ada@example.com',
    jobTitle: 'Full Stack Engineer',
    coverNote: 'Happy to work across the stack — I miss having users close by.',
  },
  { candidateEmail: 'ada@example.com', jobTitle: 'Platform Engineer (SRE)', outcome: 'rejected' },
  { candidateEmail: 'ada@example.com', jobTitle: 'Backend Engineer, Lending' },
  {
    candidateEmail: 'kiran@example.com',
    jobTitle: 'Frontend Engineer, Design Systems',
    coverNote:
      'I maintain the component library at my current company, including the accessibility audit we shipped last quarter.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'kiran@example.com', jobTitle: 'Full Stack Engineer' },
  {
    candidateEmail: 'kiran@example.com',
    jobTitle: 'Senior Backend Engineer',
    outcome: 'withdrawn',
  },
  { candidateEmail: 'kiran@example.com', jobTitle: 'Frontend Engineer (Contract)' },
  {
    candidateEmail: 'meera@example.com',
    jobTitle: 'Product Designer',
    coverNote:
      'Dense analyst tooling is exactly the kind of problem I enjoy — happy to walk through a redesign I did for a logistics dashboard.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'meera@example.com', jobTitle: 'Brand Designer (Part time)' },
  { candidateEmail: 'meera@example.com', jobTitle: 'Senior Product Designer' },
  {
    candidateEmail: 'arjun@example.com',
    jobTitle: 'Data Engineer',
    coverNote: 'Airflow and Spark day to day for the last three years.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'arjun@example.com', jobTitle: 'Machine Learning Engineer' },
  {
    candidateEmail: 'arjun@example.com',
    jobTitle: 'Analytics Consultant (Contract)',
    outcome: 'rejected',
  },
  { candidateEmail: 'arjun@example.com', jobTitle: 'Analytics Engineer' },
  {
    candidateEmail: 'leo@example.com',
    jobTitle: 'Product Manager, Storefront',
    coverNote: 'Five years of retail product work, including a storefront replatform.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'leo@example.com', jobTitle: 'Retail Operations Analyst' },
  {
    candidateEmail: 'tara@example.com',
    jobTitle: 'Platform Engineer (SRE)',
    coverNote: 'I have run the on-call rota for a 40-service estate and made it quieter.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'tara@example.com', jobTitle: 'Data Engineer' },
  { candidateEmail: 'tara@example.com', jobTitle: 'Engineering Intern', outcome: 'rejected' },
  {
    candidateEmail: 'devan@example.com',
    jobTitle: 'Senior Software Engineer, Clinical Systems',
    coverNote:
      'Seven years in regulated clinical software. I have been through three audits and would like to be through a fourth.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'devan@example.com', jobTitle: 'Store Systems Engineer' },
  {
    candidateEmail: 'nisha@example.com',
    jobTitle: 'Payments Engineer',
    coverNote:
      'I have taken a double-entry ledger through a 20x volume increase without a reconciliation break. Happy to talk about the two times we nearly did.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'nisha@example.com', jobTitle: 'Senior Backend Engineer' },
  { candidateEmail: 'nisha@example.com', jobTitle: 'Backend Engineer, Lending', outcome: 'rejected' },
  {
    candidateEmail: 'rhea@example.com',
    jobTitle: 'Senior Product Designer',
    coverNote: 'Studio work is where I do my best thinking — the variety keeps it honest.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'rhea@example.com', jobTitle: 'Motion Designer (Freelance)' },
  { candidateEmail: 'rhea@example.com', jobTitle: 'Product Designer', outcome: 'withdrawn' },
  {
    candidateEmail: 'imran@example.com',
    jobTitle: 'Analytics Engineer',
    coverNote: 'dbt from before it was fashionable. I care a lot about tests on models.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'imran@example.com', jobTitle: 'Data Engineer' },
  {
    candidateEmail: 'sanjana@example.com',
    jobTitle: 'Machine Learning Engineer',
    coverNote: 'The nightly-job-nobody-watches part of this posting is exactly my last two years.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'sanjana@example.com', jobTitle: 'Data Engineer', outcome: 'rejected' },
  {
    candidateEmail: 'vikram@example.com',
    jobTitle: 'Store Systems Engineer',
    coverNote: 'I have replaced a terminal estate live, across 120 shops, without closing one.',
    outcome: 'shortlisted',
  },
  {
    candidateEmail: 'fatima@example.com',
    jobTitle: 'Security Engineer',
    coverNote:
      'Regulated clients for four years. I like the part of the job that comes after the report.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'fatima@example.com', jobTitle: 'Compliance Manager', outcome: 'rejected' },
  {
    candidateEmail: 'gaurav@example.com',
    jobTitle: 'Enterprise Sales Manager',
    coverNote: 'Nine-month cycles into finance teams are my home ground.',
    outcome: 'shortlisted',
  },
  {
    candidateEmail: 'ananya@example.com',
    jobTitle: 'UX Researcher',
    coverNote:
      'I have run research inside hospitals for two years. Ten minutes with a tired clinician is enough if you plan for it.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'ananya@example.com', jobTitle: 'Product Designer' },
  {
    candidateEmail: 'rohit@example.com',
    jobTitle: 'QA Automation Engineer',
    coverNote: 'I replaced a four-hour regression pass with a suite that runs on every PR.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'rohit@example.com', jobTitle: 'Full Stack Engineer', outcome: 'rejected' },
  {
    candidateEmail: 'shreya@example.com',
    jobTitle: 'Growth Marketer',
    coverNote: 'Tripled trial signups by killing three channels and doubling down on one.',
    outcome: 'shortlisted',
  },
  {
    candidateEmail: 'aditya@example.com',
    jobTitle: 'Mobile Engineer (React Native)',
    coverNote: 'Offline sync is the whole job when your users have no signal. I have built for that.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'aditya@example.com', jobTitle: 'Frontend Engineer, Design Systems' },
  {
    candidateEmail: 'priyanka@example.com',
    jobTitle: 'Retail Operations Analyst',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'priyanka@example.com', jobTitle: 'Risk Analyst', outcome: 'rejected' },
  { candidateEmail: 'haris@example.com', jobTitle: 'Motion Designer (Freelance)', outcome: 'shortlisted' },
  { candidateEmail: 'haris@example.com', jobTitle: 'Visual Merchandiser (Freelance)' },
  {
    candidateEmail: 'divya@example.com',
    jobTitle: 'Compliance Manager',
    coverNote: 'Three regulated products, and evidence collection engineers stopped dreading.',
    outcome: 'shortlisted',
  },
  {
    candidateEmail: 'sameer@example.com',
    jobTitle: 'Technical Writer',
    coverNote: 'I rewrote an abandoned API reference and halved the tickets about it.',
    outcome: 'shortlisted',
  },
  {
    candidateEmail: 'neel@example.com',
    jobTitle: 'Backend Engineer, Lending',
    coverNote: 'Origination flows with an auditor attached to every transition — that is my day job.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'neel@example.com', jobTitle: 'Payments Engineer' },
  {
    candidateEmail: 'zoya@example.com',
    jobTitle: 'Engineering Intern',
    coverNote:
      'Final-year student. I built the lost-and-found app my college uses, and its bug reports taught me more than any course.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'zoya@example.com', jobTitle: 'Design Intern' },
  { candidateEmail: 'zoya@example.com', jobTitle: 'Data Science Intern', outcome: 'rejected' },
];
