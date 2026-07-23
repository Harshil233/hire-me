import type { CreateJobInput } from '../../modules/job/job.schema';
import type { RegisterCandidateInput, RegisterHrInput } from '../../modules/auth/auth.schema';
import type { UpdateCandidateProfileInput } from '../../modules/candidate/candidate.schema';

/**
 * Demo data for a local or staging database. Every account shares one password so the
 * environment is easy to explore; it satisfies the real password policy, and nothing
 * here is a production credential — the accounts exist only where this seed is run.
 *
 * The runner refuses to execute when `NODE_ENV` is production, because a shared,
 * committed password would otherwise become a real one.
 */
export const SEED_PASSWORD = 'Demo@1234';

/** Employers, each with the company created alongside the account. */
export const SEED_HRS: readonly RegisterHrInput[] = [
  {
    email: 'grace@nimbuslabs.test',
    password: SEED_PASSWORD,
    firstName: 'Grace',
    lastName: 'Hopper',
    designation: 'Head of Talent',
    company: {
      name: 'Nimbus Labs',
      domain: 'nimbuslabs.test',
      headquarters: 'Pune',
      locations: ['Pune', 'Remote'],
      description:
        'We build developer tooling for teams shipping to the cloud. Small team, long horizons, and a strong bias towards writing things down.',
      websiteUrl: 'https://nimbuslabs.test',
    },
  },
  {
    email: 'raj@aetheranalytics.test',
    password: SEED_PASSWORD,
    firstName: 'Raj',
    lastName: 'Mehta',
    designation: 'Talent Partner',
    company: {
      name: 'Aether Analytics',
      domain: 'aetheranalytics.test',
      headquarters: 'Bengaluru',
      locations: ['Bengaluru', 'Hyderabad'],
      description:
        'Decision intelligence for retail and logistics. We turn messy operational data into forecasts people actually trust.',
      websiteUrl: 'https://aetheranalytics.test',
    },
  },
  {
    email: 'sofia@northwindretail.test',
    password: SEED_PASSWORD,
    firstName: 'Sofia',
    lastName: 'Marino',
    designation: 'Recruiting Lead',
    company: {
      name: 'Northwind Retail',
      domain: 'northwindretail.test',
      headquarters: 'Mumbai',
      locations: ['Mumbai', 'Pune', 'Remote'],
      description:
        'A retail group running 200+ stores and a growing online arm. Engineering, design and operations all sit in one building.',
      websiteUrl: 'https://northwindretail.test',
    },
  },
];

export interface SeedJob {
  /** Employer email the listing belongs to. */
  readonly hrEmail: string;
  readonly job: CreateJobInput;
  /** Left as a draft when false; closed listings are published then closed. */
  readonly publish: boolean;
  readonly close?: boolean;
}

export const SEED_JOBS: readonly SeedJob[] = [
  {
    hrEmail: 'grace@nimbuslabs.test',
    publish: true,
    job: {
      title: 'Senior Backend Engineer',
      description:
        'Own our API from schema to production. You will shape the data model, keep the request path fast, and help the team make decisions that survive contact with real traffic.\n\nWe care more about how you reason through a trade-off than which framework you last used.',
      role: 'engineering',
      jobType: 'full_time',
      workMode: 'hybrid',
      skills: ['TypeScript', 'Node.js', 'MongoDB', 'REST'],
      locations: ['Pune', 'Remote'],
      ctcMin: 1_800_000,
      ctcMax: 2_800_000,
      experienceMinYears: 4,
      experienceMaxYears: 8,
    },
  },
  {
    hrEmail: 'grace@nimbuslabs.test',
    publish: true,
    job: {
      title: 'Frontend Engineer, Design Systems',
      description:
        'Build the component library the rest of the product is assembled from. Accessibility and theming are first-class here, not a retrofit.',
      role: 'engineering',
      jobType: 'full_time',
      workMode: 'remote',
      skills: ['React', 'TypeScript', 'CSS', 'Accessibility'],
      locations: ['Remote'],
      ctcMin: 1_600_000,
      ctcMax: 2_400_000,
      experienceMinYears: 3,
      experienceMaxYears: 6,
    },
  },
  {
    hrEmail: 'grace@nimbuslabs.test',
    publish: true,
    job: {
      title: 'Platform Engineer (SRE)',
      description:
        'Keep the lights on and make the on-call rota boring. Terraform, observability, and a genuine say in the architecture.',
      role: 'operations',
      jobType: 'full_time',
      workMode: 'hybrid',
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Observability'],
      locations: ['Pune'],
      ctcMin: 2_000_000,
      ctcMax: 3_200_000,
      experienceMinYears: 5,
    },
  },
  {
    hrEmail: 'grace@nimbuslabs.test',
    publish: true,
    job: {
      title: 'Engineering Intern',
      description:
        'Six months alongside the platform team. You will ship something real and have your name on it.',
      role: 'engineering',
      jobType: 'internship',
      workMode: 'onsite',
      skills: ['JavaScript', 'Git'],
      locations: ['Pune'],
      ctcMin: 300_000,
      ctcMax: 480_000,
      experienceMaxYears: 1,
    },
  },
  {
    hrEmail: 'grace@nimbuslabs.test',
    publish: false,
    job: {
      title: 'Developer Advocate',
      description:
        'Still shaping this one — talks, docs and sample apps, with real engineering time protected.',
      role: 'marketing',
      jobType: 'full_time',
      workMode: 'remote',
      skills: ['Writing', 'Public Speaking', 'TypeScript'],
      locations: ['Remote'],
      ctcMin: 1_400_000,
      ctcMax: 2_000_000,
      experienceMinYears: 3,
    },
  },
  {
    hrEmail: 'raj@aetheranalytics.test',
    publish: true,
    job: {
      title: 'Data Engineer',
      description:
        'Build the pipelines the forecasting team depends on. Batch today, streaming where it earns its keep.',
      role: 'engineering',
      jobType: 'full_time',
      workMode: 'hybrid',
      skills: ['Python', 'Airflow', 'SQL', 'Spark'],
      locations: ['Bengaluru'],
      ctcMin: 1_900_000,
      ctcMax: 3_000_000,
      experienceMinYears: 4,
      experienceMaxYears: 9,
    },
  },
  {
    hrEmail: 'raj@aetheranalytics.test',
    publish: true,
    job: {
      title: 'Machine Learning Engineer',
      description:
        'Take forecasting models from a notebook to something that runs every night without anyone watching.',
      role: 'engineering',
      jobType: 'full_time',
      workMode: 'onsite',
      skills: ['Python', 'PyTorch', 'MLOps', 'SQL'],
      locations: ['Bengaluru', 'Hyderabad'],
      ctcMin: 2_400_000,
      ctcMax: 3_800_000,
      experienceMinYears: 4,
    },
  },
  {
    hrEmail: 'raj@aetheranalytics.test',
    publish: true,
    job: {
      title: 'Product Designer',
      description:
        'Own the end-to-end experience for our analyst tooling. Dense data, tight screens, real users on a deadline.',
      role: 'design',
      jobType: 'full_time',
      workMode: 'remote',
      skills: ['Figma', 'Prototyping', 'Design Systems', 'User Research'],
      locations: ['Remote', 'Bengaluru'],
      ctcMin: 1_500_000,
      ctcMax: 2_600_000,
      experienceMinYears: 3,
      experienceMaxYears: 8,
    },
  },
  {
    hrEmail: 'raj@aetheranalytics.test',
    publish: true,
    job: {
      title: 'Analytics Consultant (Contract)',
      description:
        'Six-month engagement helping a retail client make sense of their stock movement data.',
      role: 'operations',
      jobType: 'contract',
      workMode: 'remote',
      skills: ['SQL', 'Tableau', 'Stakeholder Management'],
      locations: ['Remote'],
      ctcMin: 1_200_000,
      ctcMax: 1_800_000,
      experienceMinYears: 2,
    },
  },
  {
    hrEmail: 'raj@aetheranalytics.test',
    publish: true,
    close: true,
    job: {
      title: 'Senior Data Scientist',
      description:
        'This search has closed — kept here so the closed state is visible in the demo data.',
      role: 'engineering',
      jobType: 'full_time',
      workMode: 'hybrid',
      skills: ['Python', 'Statistics', 'Experimentation'],
      locations: ['Bengaluru'],
      ctcMin: 2_800_000,
      ctcMax: 4_200_000,
      experienceMinYears: 6,
    },
  },
  {
    hrEmail: 'sofia@northwindretail.test',
    publish: true,
    job: {
      title: 'Product Manager, Storefront',
      description:
        'Own the online storefront roadmap. You will sit between merchandising, engineering and the stores themselves.',
      role: 'product',
      jobType: 'full_time',
      workMode: 'hybrid',
      skills: ['Roadmapping', 'Analytics', 'Stakeholder Management'],
      locations: ['Mumbai'],
      ctcMin: 2_200_000,
      ctcMax: 3_400_000,
      experienceMinYears: 5,
      experienceMaxYears: 10,
    },
  },
  {
    hrEmail: 'sofia@northwindretail.test',
    publish: true,
    job: {
      title: 'Full Stack Engineer',
      description:
        'Storefront and the internal tools behind it. One codebase, small team, quick feedback from actual shop floors.',
      role: 'engineering',
      jobType: 'full_time',
      workMode: 'hybrid',
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      locations: ['Mumbai', 'Pune'],
      ctcMin: 1_500_000,
      ctcMax: 2_500_000,
      experienceMinYears: 3,
      experienceMaxYears: 7,
    },
  },
  {
    hrEmail: 'sofia@northwindretail.test',
    publish: true,
    job: {
      title: 'Retail Operations Analyst',
      description:
        'Turn store-level numbers into decisions the regional managers can act on this week.',
      role: 'operations',
      jobType: 'full_time',
      workMode: 'onsite',
      skills: ['Excel', 'SQL', 'Forecasting'],
      locations: ['Mumbai'],
      ctcMin: 900_000,
      ctcMax: 1_500_000,
      experienceMinYears: 2,
      experienceMaxYears: 5,
    },
  },
  {
    hrEmail: 'sofia@northwindretail.test',
    publish: true,
    job: {
      title: 'Brand Designer (Part time)',
      description:
        'Campaign artwork across print and digital, three days a week, working directly with the marketing lead.',
      role: 'design',
      jobType: 'part_time',
      workMode: 'remote',
      skills: ['Illustrator', 'Branding', 'Typography'],
      locations: ['Remote'],
      ctcMin: 600_000,
      ctcMax: 1_000_000,
      experienceMinYears: 2,
    },
  },
  {
    hrEmail: 'sofia@northwindretail.test',
    publish: false,
    job: {
      title: 'Finance Analyst',
      description: 'Draft listing — headcount not yet approved.',
      role: 'finance',
      jobType: 'full_time',
      workMode: 'onsite',
      skills: ['Excel', 'Financial Modelling'],
      locations: ['Mumbai'],
      ctcMin: 1_000_000,
      ctcMax: 1_600_000,
      experienceMinYears: 2,
    },
  },
];

export interface SeedCandidate {
  readonly account: RegisterCandidateInput;
  readonly profile: UpdateCandidateProfileInput;
}

export const SEED_CANDIDATES: readonly SeedCandidate[] = [
  {
    account: {
      email: 'ada@example.com',
      password: SEED_PASSWORD,
      firstName: 'Ada',
      lastName: 'Lovelace',
    },
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Remote'],
      skills: ['TypeScript', 'Node.js', 'MongoDB', 'REST'],
      jobTypes: ['full_time'],
      currentCtc: 1_600_000,
      expectedCtc: 2_400_000,
    },
  },
  {
    account: {
      email: 'kiran@example.com',
      password: SEED_PASSWORD,
      firstName: 'Kiran',
      lastName: 'Rao',
    },
    profile: {
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru', 'Remote'],
      skills: ['React', 'TypeScript', 'CSS', 'Accessibility'],
      jobTypes: ['full_time', 'contract'],
      currentCtc: 1_400_000,
      expectedCtc: 2_100_000,
    },
  },
  {
    account: {
      email: 'meera@example.com',
      password: SEED_PASSWORD,
      firstName: 'Meera',
      lastName: 'Nair',
    },
    profile: {
      currentLocation: 'Remote',
      preferredLocations: ['Remote', 'Bengaluru'],
      skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
      jobTypes: ['full_time', 'part_time'],
      currentCtc: 1_300_000,
      expectedCtc: 2_000_000,
    },
  },
  {
    account: {
      email: 'arjun@example.com',
      password: SEED_PASSWORD,
      firstName: 'Arjun',
      lastName: 'Singh',
    },
    profile: {
      currentLocation: 'Hyderabad',
      preferredLocations: ['Hyderabad', 'Bengaluru'],
      skills: ['Python', 'Airflow', 'SQL', 'Spark'],
      jobTypes: ['full_time'],
      currentCtc: 1_900_000,
      expectedCtc: 2_900_000,
    },
  },
  {
    account: {
      email: 'leo@example.com',
      password: SEED_PASSWORD,
      firstName: 'Leo',
      lastName: 'Fernandes',
    },
    profile: {
      currentLocation: 'Mumbai',
      preferredLocations: ['Mumbai', 'Pune'],
      skills: ['Roadmapping', 'Analytics', 'Stakeholder Management'],
      jobTypes: ['full_time'],
      currentCtc: 2_100_000,
      expectedCtc: 3_100_000,
    },
  },
  {
    account: {
      email: 'tara@example.com',
      password: SEED_PASSWORD,
      firstName: 'Tara',
      lastName: 'Iyer',
    },
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Remote'],
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Observability'],
      jobTypes: ['full_time'],
      currentCtc: 2_000_000,
      expectedCtc: 3_000_000,
    },
  },
];

/** Which candidate applies to which listing, and where the employer took it next. */
export interface SeedApplication {
  readonly candidateEmail: string;
  readonly jobTitle: string;
  readonly coverNote?: string;
  /** Applied when omitted. `withdrawn` is performed by the candidate. */
  readonly outcome?: 'shortlisted' | 'rejected' | 'withdrawn';
}

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
  {
    candidateEmail: 'meera@example.com',
    jobTitle: 'Product Designer',
    coverNote:
      'Dense analyst tooling is exactly the kind of problem I enjoy — happy to walk through a redesign I did for a logistics dashboard.',
    outcome: 'shortlisted',
  },
  { candidateEmail: 'meera@example.com', jobTitle: 'Brand Designer (Part time)' },
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
];
