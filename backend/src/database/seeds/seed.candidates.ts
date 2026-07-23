import { SEED_PASSWORD } from './seed.password';
import type { SeedCandidate } from './seed.types';

/** Keeps every account definition to the two fields that actually differ. */
const account = (
  email: string,
  firstName: string,
  lastName: string,
): SeedCandidate['account'] => ({ email, password: SEED_PASSWORD, firstName, lastName });

/**
 * The talent pool an employer browses. Spread across cities, disciplines, seniorities and
 * job types so the filters have something to bite on, and each one carries the sections
 * that make their detail page worth opening.
 */
export const SEED_CANDIDATES: readonly SeedCandidate[] = [
  /*
   * The documented demo candidate. Kept first, given its own password, and filled in
   * properly — this is the profile someone opens to see what a complete one looks like.
   */
  {
    account: {
      email: 'user@test.com',
      password: 'User@1234',
      firstName: 'Rohan',
      lastName: 'Mehta',
    },
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Bengaluru', 'Remote'],
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
      jobTypes: ['full_time'],
      currentCtc: 1_800_000,
      expectedCtc: 2_600_000,
      mobile: { countryCode: '+91', number: '9822014567' },
      gender: 'male',
      dob: '1997-03-14',
    },
    sections: {
      experience: [
        {
          title: 'Senior Software Engineer',
          companyName: 'Cobalt Systems',
          description:
            'Own the billing service end to end. Led the move off a shared database that had been coupling four teams together, and cut the month-end invoicing run from six hours to twenty minutes.',
          startDate: '2023-02-01',
          isCurrent: true,
          skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
        },
        {
          title: 'Software Engineer',
          companyName: 'Cobalt Systems',
          description:
            'Built the customer-facing dashboard and the reporting API behind it. First on-call rotation, which is where I learned to instrument things before they break.',
          startDate: '2021-06-01',
          endDate: '2023-01-31',
          isCurrent: false,
          skills: ['React', 'TypeScript', 'REST'],
        },
        {
          title: 'Associate Engineer',
          companyName: 'Trellis Software',
          startDate: '2019-08-01',
          endDate: '2021-05-31',
          isCurrent: false,
          skills: ['JavaScript', 'Express', 'MySQL'],
        },
      ],
      education: [
        {
          college: 'College of Engineering, Pune',
          course: 'Computer Engineering',
          degree: 'B.Tech',
          description: 'Graduated with distinction. Final-year project on query planning.',
          startDate: '2015-07-01',
          endDate: '2019-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Invoice reconciliation toolkit',
          description:
            'A small service that diffs what we billed against what the payment provider settled, and explains the difference in words rather than a spreadsheet. In use by the finance team.',
          skills: ['TypeScript', 'PostgreSQL'],
          link: 'https://github.com/example/reconcile',
          startDate: '2024-02-01',
          endDate: '2024-09-01',
          isCurrent: false,
        },
        {
          title: 'Open-source contributions',
          description:
            'Occasional fixes to the Node.js Postgres driver, mostly around connection pooling under load.',
          skills: ['Node.js', 'PostgreSQL'],
          startDate: '2023-01-01',
          isCurrent: true,
        },
      ],
      certifications: [
        {
          title: 'AWS Certified Solutions Architect — Associate',
          issuedBy: 'Amazon Web Services',
          issuedOn: '2024-04-18',
          expiresOn: '2027-04-18',
          credentialUrl: 'https://www.credly.com/badges/example',
        },
        {
          title: 'Certified Kubernetes Application Developer',
          issuedBy: 'CNCF',
          issuedOn: '2023-11-02',
          expiresOn: '2026-11-02',
        },
      ],
    },
  },
  {
    account: account('ada@example.com', 'Ada', 'Lovelace'),
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Remote'],
      skills: ['TypeScript', 'Node.js', 'MongoDB', 'REST'],
      jobTypes: ['full_time'],
      currentCtc: 1_600_000,
      expectedCtc: 2_400_000,
    },
    sections: {
      experience: [
        {
          title: 'Backend Engineer',
          companyName: 'Kettle Payments',
          description:
            'Owned the payments API end to end, including the migration off a shared database that had been putting the whole product at risk.',
          startDate: '2022-04-01',
          isCurrent: true,
          skills: ['TypeScript', 'Node.js', 'MongoDB'],
        },
        {
          title: 'Software Engineer',
          companyName: 'Trellis Software',
          startDate: '2019-07-01',
          endDate: '2022-03-31',
          isCurrent: false,
          skills: ['JavaScript', 'Express', 'PostgreSQL'],
        },
      ],
      education: [
        {
          college: 'College of Engineering, Pune',
          course: 'Computer Engineering',
          degree: 'B.Tech',
          startDate: '2015-07-01',
          endDate: '2019-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Schema drift detector',
          description:
            'A small CLI that diffs a running MongoDB against the schema the code expects. Written after one too many surprise production incidents.',
          skills: ['TypeScript', 'MongoDB'],
          link: 'https://github.com/example/schema-drift',
          startDate: '2023-02-01',
          isCurrent: false,
          endDate: '2023-08-01',
        },
      ],
      certifications: [
        {
          title: 'MongoDB Associate Developer',
          issuedBy: 'MongoDB',
          issuedOn: '2023-05-10',
        },
      ],
    },
  },
  {
    account: account('kiran@example.com', 'Kiran', 'Rao'),
    profile: {
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru', 'Remote'],
      skills: ['React', 'TypeScript', 'CSS', 'Accessibility'],
      jobTypes: ['full_time', 'contract'],
      currentCtc: 1_400_000,
      expectedCtc: 2_100_000,
    },
    sections: {
      experience: [
        {
          title: 'Frontend Engineer',
          companyName: 'Halcyon Health',
          description:
            'Maintain the design system used by six product teams. Led the accessibility audit that took us to WCAG 2.1 AA.',
          startDate: '2021-09-01',
          isCurrent: true,
          skills: ['React', 'TypeScript', 'Accessibility'],
        },
      ],
      education: [
        {
          college: 'RV College of Engineering',
          course: 'Information Science',
          degree: 'B.E.',
          startDate: '2016-08-01',
          endDate: '2020-06-30',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Contrast checker browser extension',
          description: 'Flags text that fails contrast requirements as you browse.',
          skills: ['TypeScript', 'Accessibility'],
          startDate: '2022-01-01',
          endDate: '2022-06-01',
          isCurrent: false,
        },
      ],
      certifications: [
        {
          title: 'Certified Professional in Accessibility Core Competencies',
          issuedBy: 'IAAP',
          issuedOn: '2023-03-01',
        },
      ],
    },
  },
  {
    account: account('meera@example.com', 'Meera', 'Nair'),
    profile: {
      currentLocation: 'Remote',
      preferredLocations: ['Remote', 'Bengaluru'],
      skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
      jobTypes: ['full_time', 'part_time'],
      currentCtc: 1_300_000,
      expectedCtc: 2_000_000,
    },
    sections: {
      experience: [
        {
          title: 'Product Designer',
          companyName: 'Cartograph',
          description:
            'Redesigned a logistics dashboard that operators had been working around for years. Shipped with a research trail people still cite.',
          startDate: '2021-02-01',
          isCurrent: true,
          skills: ['Figma', 'User Research', 'Design Systems'],
        },
      ],
      education: [
        {
          college: 'National Institute of Design',
          course: 'Interaction Design',
          degree: 'M.Des',
          startDate: '2017-07-01',
          endDate: '2020-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Field research kit',
          description:
            'A set of templates and prompts for running research when the participants are on their feet all day.',
          skills: ['User Research', 'Facilitation'],
          startDate: '2022-09-01',
          endDate: '2023-01-01',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('arjun@example.com', 'Arjun', 'Singh'),
    profile: {
      currentLocation: 'Hyderabad',
      preferredLocations: ['Hyderabad', 'Bengaluru'],
      skills: ['Python', 'Airflow', 'SQL', 'Spark'],
      jobTypes: ['full_time'],
      currentCtc: 1_900_000,
      expectedCtc: 2_900_000,
    },
    sections: {
      experience: [
        {
          title: 'Data Engineer',
          companyName: 'Meridian Logistics',
          description:
            'Rebuilt the nightly pipeline so it finished before the analysts arrived rather than during their first meeting.',
          startDate: '2021-06-01',
          isCurrent: true,
          skills: ['Python', 'Airflow', 'Spark'],
        },
        {
          title: 'Analyst',
          companyName: 'Meridian Logistics',
          startDate: '2019-08-01',
          endDate: '2021-05-31',
          isCurrent: false,
          skills: ['SQL', 'Excel'],
        },
      ],
      education: [
        {
          college: 'IIT Hyderabad',
          course: 'Chemical Engineering',
          degree: 'B.Tech',
          startDate: '2015-07-01',
          endDate: '2019-05-31',
          isCurrent: false,
        },
      ],
      certifications: [
        {
          title: 'Google Cloud Professional Data Engineer',
          issuedBy: 'Google Cloud',
          issuedOn: '2022-11-15',
          expiresOn: '2027-11-15',
        },
      ],
    },
  },
  {
    account: account('leo@example.com', 'Leo', 'Fernandes'),
    profile: {
      currentLocation: 'Mumbai',
      preferredLocations: ['Mumbai', 'Pune'],
      skills: ['Roadmapping', 'Analytics', 'Stakeholder Management'],
      jobTypes: ['full_time'],
      currentCtc: 2_100_000,
      expectedCtc: 3_100_000,
    },
    sections: {
      experience: [
        {
          title: 'Senior Product Manager',
          companyName: 'Harbour Retail',
          description:
            'Led a storefront replatform across 90 stores without a revenue dip in the switchover week.',
          startDate: '2020-03-01',
          isCurrent: true,
          skills: ['Roadmapping', 'Analytics'],
        },
      ],
      education: [
        {
          college: 'Symbiosis Institute of Business Management',
          course: 'Marketing',
          degree: 'MBA',
          startDate: '2016-06-01',
          endDate: '2018-04-30',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('tara@example.com', 'Tara', 'Iyer'),
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Remote'],
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Observability'],
      jobTypes: ['full_time'],
      currentCtc: 2_000_000,
      expectedCtc: 3_000_000,
    },
    sections: {
      experience: [
        {
          title: 'Site Reliability Engineer',
          companyName: 'Beacon Cloud',
          description:
            'Took a 40-service estate from weekly incidents to monthly, mostly by deleting things and fixing alerts nobody trusted.',
          startDate: '2020-11-01',
          isCurrent: true,
          skills: ['Kubernetes', 'Terraform', 'Observability'],
        },
      ],
      education: [
        {
          college: 'VIT Pune',
          course: 'Computer Engineering',
          degree: 'B.E.',
          startDate: '2014-07-01',
          endDate: '2018-05-31',
          isCurrent: false,
        },
      ],
      certifications: [
        {
          title: 'Certified Kubernetes Administrator',
          issuedBy: 'CNCF',
          issuedOn: '2021-08-20',
          expiresOn: '2027-08-20',
        },
        {
          title: 'HashiCorp Certified: Terraform Associate',
          issuedBy: 'HashiCorp',
          issuedOn: '2022-02-10',
        },
      ],
    },
  },
  {
    account: account('devan@example.com', 'Devan', 'Menon'),
    profile: {
      currentLocation: 'Chennai',
      preferredLocations: ['Chennai', 'Bengaluru'],
      skills: ['Java', 'Spring', 'PostgreSQL', 'HL7'],
      jobTypes: ['full_time'],
      currentCtc: 2_200_000,
      expectedCtc: 3_200_000,
    },
    sections: {
      experience: [
        {
          title: 'Senior Software Engineer',
          companyName: 'Caduceus Systems',
          description:
            'Seven years on hospital scheduling software. Comfortable with audits, and with the paperwork that makes them short.',
          startDate: '2019-01-01',
          isCurrent: true,
          skills: ['Java', 'Spring', 'HL7'],
        },
      ],
      education: [
        {
          college: 'Anna University',
          course: 'Computer Science',
          degree: 'B.E.',
          startDate: '2012-07-01',
          endDate: '2016-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('nisha@example.com', 'Nisha', 'Bhatt'),
    profile: {
      currentLocation: 'Gurugram',
      preferredLocations: ['Gurugram', 'Remote'],
      skills: ['Go', 'PostgreSQL', 'Distributed Systems', 'Payments'],
      jobTypes: ['full_time'],
      currentCtc: 2_600_000,
      expectedCtc: 3_800_000,
    },
    sections: {
      experience: [
        {
          title: 'Staff Engineer, Ledger',
          companyName: 'Tessellate Pay',
          description:
            'Owned the double-entry ledger through a 20x volume increase. Wrote the reconciliation that catches what the ledger cannot.',
          startDate: '2021-04-01',
          isCurrent: true,
          skills: ['Go', 'Distributed Systems', 'Payments'],
        },
        {
          title: 'Backend Engineer',
          companyName: 'Tessellate Pay',
          startDate: '2018-06-01',
          endDate: '2021-03-31',
          isCurrent: false,
          skills: ['Go', 'PostgreSQL'],
        },
      ],
      education: [
        {
          college: 'BITS Pilani',
          course: 'Computer Science',
          degree: 'B.E.',
          startDate: '2014-08-01',
          endDate: '2018-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Ledger fuzzer',
          description:
            'Property-based tests that try very hard to make money appear from nowhere. It has found three real bugs.',
          skills: ['Go', 'Testing'],
          startDate: '2022-05-01',
          isCurrent: true,
        },
      ],
    },
  },
  {
    account: account('rhea@example.com', 'Rhea', 'Kapoor'),
    profile: {
      currentLocation: 'Goa',
      preferredLocations: ['Goa', 'Remote'],
      skills: ['Figma', 'Interaction Design', 'Motion Design', 'Prototyping'],
      jobTypes: ['full_time', 'freelance'],
      currentCtc: 1_500_000,
      expectedCtc: 2_400_000,
    },
    sections: {
      experience: [
        {
          title: 'Product Designer',
          companyName: 'Nine Yards Studio',
          startDate: '2020-08-01',
          isCurrent: true,
          skills: ['Figma', 'Interaction Design', 'Motion Design'],
        },
      ],
      education: [
        {
          college: 'Srishti Manipal Institute',
          course: 'Visual Communication',
          degree: 'B.Des',
          startDate: '2016-07-01',
          endDate: '2020-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Interface motion primer',
          description:
            'A public reference of easing curves and durations, with the reasoning behind each one.',
          skills: ['Motion Design', 'After Effects'],
          link: 'https://example.com/motion-primer',
          startDate: '2023-04-01',
          endDate: '2023-10-01',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('imran@example.com', 'Imran', 'Sheikh'),
    profile: {
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru', 'Remote'],
      skills: ['dbt', 'SQL', 'Snowflake', 'Python'],
      jobTypes: ['full_time', 'contract'],
      currentCtc: 1_700_000,
      expectedCtc: 2_600_000,
    },
    sections: {
      experience: [
        {
          title: 'Analytics Engineer',
          companyName: 'Fathom Retail',
          description:
            'Turned a warehouse nobody trusted into one with tests, documentation and an owner for every model.',
          startDate: '2021-11-01',
          isCurrent: true,
          skills: ['dbt', 'Snowflake', 'SQL'],
        },
      ],
      education: [
        {
          college: 'University of Hyderabad',
          course: 'Statistics',
          degree: 'M.Sc',
          startDate: '2017-07-01',
          endDate: '2019-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('sanjana@example.com', 'Sanjana', 'Reddy'),
    profile: {
      currentLocation: 'Hyderabad',
      preferredLocations: ['Hyderabad', 'Remote'],
      skills: ['Python', 'PyTorch', 'MLOps', 'SQL'],
      jobTypes: ['full_time'],
      currentCtc: 2_400_000,
      expectedCtc: 3_500_000,
    },
    sections: {
      experience: [
        {
          title: 'Machine Learning Engineer',
          companyName: 'Vantage Forecasting',
          description:
            'Moved demand forecasting off a laptop and into a nightly job with monitoring, retraining and a rollback plan.',
          startDate: '2020-09-01',
          isCurrent: true,
          skills: ['Python', 'PyTorch', 'MLOps'],
        },
      ],
      education: [
        {
          college: 'IIIT Hyderabad',
          course: 'Computer Science',
          degree: 'M.Tech',
          startDate: '2018-07-01',
          endDate: '2020-05-31',
          isCurrent: false,
        },
      ],
      certifications: [
        {
          title: 'AWS Certified Machine Learning — Specialty',
          issuedBy: 'Amazon Web Services',
          issuedOn: '2023-01-20',
          expiresOn: '2026-01-20',
        },
      ],
    },
  },
  {
    account: account('vikram@example.com', 'Vikram', 'Joshi'),
    profile: {
      currentLocation: 'Mumbai',
      preferredLocations: ['Mumbai'],
      skills: ['Java', 'Linux', 'Networking', 'PostgreSQL'],
      jobTypes: ['full_time'],
      currentCtc: 1_500_000,
      expectedCtc: 2_200_000,
    },
    sections: {
      experience: [
        {
          title: 'Systems Engineer',
          companyName: 'Grandline Stores',
          description:
            'Point-of-sale across 120 shops, including the year we replaced every terminal without closing one of them.',
          startDate: '2019-05-01',
          isCurrent: true,
          skills: ['Java', 'Linux', 'Networking'],
        },
      ],
      education: [
        {
          college: 'Mumbai University',
          course: 'Information Technology',
          degree: 'B.E.',
          startDate: '2013-07-01',
          endDate: '2017-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('fatima@example.com', 'Fatima', 'Ansari'),
    profile: {
      currentLocation: 'Remote',
      preferredLocations: ['Remote', 'Chennai'],
      skills: ['AppSec', 'Threat Modelling', 'Cryptography', 'Cloud Security'],
      jobTypes: ['full_time'],
      currentCtc: 2_400_000,
      expectedCtc: 3_600_000,
    },
    sections: {
      experience: [
        {
          title: 'Security Engineer',
          companyName: 'Ironwood Security',
          description:
            'Application security for regulated clients: threat models, reviews, and staying long enough to see the fixes land.',
          startDate: '2020-02-01',
          isCurrent: true,
          skills: ['AppSec', 'Threat Modelling', 'Cloud Security'],
        },
      ],
      education: [
        {
          college: 'Jadavpur University',
          course: 'Computer Science',
          degree: 'B.E.',
          startDate: '2013-08-01',
          endDate: '2017-05-31',
          isCurrent: false,
        },
      ],
      certifications: [
        {
          title: 'Offensive Security Certified Professional',
          issuedBy: 'OffSec',
          issuedOn: '2021-06-05',
        },
      ],
    },
  },
  {
    account: account('gaurav@example.com', 'Gaurav', 'Malhotra'),
    profile: {
      currentLocation: 'Gurugram',
      preferredLocations: ['Gurugram', 'Bengaluru'],
      skills: ['Enterprise Sales', 'Negotiation', 'CRM'],
      jobTypes: ['full_time'],
      currentCtc: 2_300_000,
      expectedCtc: 3_400_000,
    },
    sections: {
      experience: [
        {
          title: 'Enterprise Account Executive',
          companyName: 'Quorum Software',
          description:
            'Nine-month sales cycles into finance teams. Closed the two largest contracts the company has signed.',
          startDate: '2019-10-01',
          isCurrent: true,
          skills: ['Enterprise Sales', 'Negotiation'],
        },
      ],
      education: [
        {
          college: 'Delhi University',
          course: 'Economics',
          degree: 'B.A.',
          startDate: '2012-07-01',
          endDate: '2015-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('ananya@example.com', 'Ananya', 'Ghosh'),
    profile: {
      currentLocation: 'Chennai',
      preferredLocations: ['Chennai', 'Remote'],
      skills: ['User Research', 'Interviewing', 'Usability Testing', 'Synthesis'],
      jobTypes: ['full_time', 'part_time'],
      currentCtc: 1_400_000,
      expectedCtc: 2_100_000,
    },
    sections: {
      experience: [
        {
          title: 'UX Researcher',
          companyName: 'Sundial Health',
          description:
            'Two years of research inside hospitals. Learned to run a useful session in the ten minutes someone actually has.',
          startDate: '2022-01-01',
          isCurrent: true,
          skills: ['User Research', 'Usability Testing'],
        },
      ],
      education: [
        {
          college: 'IIT Bombay',
          course: 'Industrial Design',
          degree: 'M.Des',
          startDate: '2019-07-01',
          endDate: '2021-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('rohit@example.com', 'Rohit', 'Verma'),
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Mumbai'],
      skills: ['Playwright', 'TypeScript', 'CI/CD', 'Test Design'],
      jobTypes: ['full_time'],
      currentCtc: 1_300_000,
      expectedCtc: 1_950_000,
    },
    sections: {
      experience: [
        {
          title: 'QA Automation Engineer',
          companyName: 'Bluepeak Systems',
          description:
            'Replaced a four-hour manual regression pass with a suite that runs on every pull request.',
          startDate: '2021-03-01',
          isCurrent: true,
          skills: ['Playwright', 'TypeScript', 'CI/CD'],
        },
      ],
      education: [
        {
          college: 'Pune Institute of Computer Technology',
          course: 'Computer Engineering',
          degree: 'B.E.',
          startDate: '2016-07-01',
          endDate: '2020-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('shreya@example.com', 'Shreya', 'Pillai'),
    profile: {
      currentLocation: 'Remote',
      preferredLocations: ['Remote'],
      skills: ['SEO', 'Paid Acquisition', 'Analytics', 'Copywriting'],
      jobTypes: ['full_time', 'contract'],
      currentCtc: 1_200_000,
      expectedCtc: 1_900_000,
    },
    sections: {
      experience: [
        {
          title: 'Growth Marketer',
          companyName: 'Lantern SaaS',
          description:
            'Owned self-serve acquisition. Tripled trial signups over eighteen months, mostly by killing what did not work.',
          startDate: '2021-07-01',
          isCurrent: true,
          skills: ['SEO', 'Paid Acquisition', 'Analytics'],
        },
      ],
      education: [
        {
          college: 'Christ University',
          course: 'Communication',
          degree: 'B.A.',
          startDate: '2015-07-01',
          endDate: '2018-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('aditya@example.com', 'Aditya', 'Kulkarni'),
    profile: {
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru', 'Remote'],
      skills: ['React Native', 'TypeScript', 'Offline Sync'],
      jobTypes: ['full_time'],
      currentCtc: 1_800_000,
      expectedCtc: 2_700_000,
    },
    sections: {
      experience: [
        {
          title: 'Mobile Engineer',
          companyName: 'Fieldwork Apps',
          description:
            'Built for people with no signal half the day, which makes sync the whole job rather than a detail of it.',
          startDate: '2020-06-01',
          isCurrent: true,
          skills: ['React Native', 'TypeScript', 'Offline Sync'],
        },
      ],
      education: [
        {
          college: 'Manipal Institute of Technology',
          course: 'Computer Science',
          degree: 'B.Tech',
          startDate: '2014-07-01',
          endDate: '2018-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Conflict-free notes',
          description: 'A CRDT-backed note app built to understand merge semantics properly.',
          skills: ['TypeScript', 'CRDT'],
          startDate: '2022-03-01',
          endDate: '2022-11-01',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('priyanka@example.com', 'Priyanka', 'Shah'),
    profile: {
      currentLocation: 'Mumbai',
      preferredLocations: ['Mumbai', 'Remote'],
      skills: ['Excel', 'SQL', 'Forecasting'],
      jobTypes: ['full_time'],
      currentCtc: 900_000,
      expectedCtc: 1_400_000,
    },
    sections: {
      experience: [
        {
          title: 'Operations Analyst',
          companyName: 'Seaboard Retail',
          startDate: '2022-02-01',
          isCurrent: true,
          skills: ['Excel', 'SQL', 'Forecasting'],
        },
      ],
      education: [
        {
          college: 'NMIMS',
          course: 'Business Analytics',
          degree: 'B.Sc',
          startDate: '2018-07-01',
          endDate: '2021-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('haris@example.com', 'Haris', 'Qureshi'),
    profile: {
      currentLocation: 'Remote',
      preferredLocations: ['Remote', 'Goa'],
      skills: ['After Effects', 'Motion Design', 'Storyboarding'],
      jobTypes: ['freelance', 'part_time'],
      currentCtc: 800_000,
      expectedCtc: 1_300_000,
    },
    sections: {
      experience: [
        {
          title: 'Freelance Motion Designer',
          companyName: 'Independent',
          description:
            'Launch films and interface motion for product companies, roughly one engagement a month.',
          startDate: '2021-01-01',
          isCurrent: true,
          skills: ['After Effects', 'Motion Design'],
        },
      ],
      education: [
        {
          college: 'MIT Institute of Design',
          course: 'Animation',
          degree: 'B.Des',
          startDate: '2016-07-01',
          endDate: '2020-05-31',
          isCurrent: false,
        },
      ],
      projects: [
        {
          title: 'Thirty-second explainers',
          description: 'A self-set brief: explain one idea a week in thirty seconds of motion.',
          skills: ['Motion Design', 'Storyboarding'],
          startDate: '2023-01-01',
          isCurrent: true,
        },
      ],
    },
  },
  {
    account: account('divya@example.com', 'Divya', 'Ramesh'),
    profile: {
      currentLocation: 'Chennai',
      preferredLocations: ['Chennai'],
      skills: ['ISO 27001', 'Audit', 'Policy', 'Risk'],
      jobTypes: ['full_time'],
      currentCtc: 1_700_000,
      expectedCtc: 2_400_000,
    },
    sections: {
      experience: [
        {
          title: 'Compliance Manager',
          companyName: 'Northgate Assurance',
          description:
            'Ran the audit calendar for three regulated products, and made the evidence collection something engineers stopped dreading.',
          startDate: '2018-04-01',
          isCurrent: true,
          skills: ['ISO 27001', 'Audit', 'Risk'],
        },
      ],
      education: [
        {
          college: 'Loyola College',
          course: 'Commerce',
          degree: 'B.Com',
          startDate: '2010-07-01',
          endDate: '2013-05-31',
          isCurrent: false,
        },
      ],
      certifications: [
        {
          title: 'ISO 27001 Lead Auditor',
          issuedBy: 'BSI',
          issuedOn: '2019-09-12',
        },
      ],
    },
  },
  {
    account: account('sameer@example.com', 'Sameer', 'Deshpande'),
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Remote'],
      skills: ['Technical Writing', 'Markdown', 'Git', 'APIs'],
      jobTypes: ['contract', 'full_time'],
      currentCtc: 1_100_000,
      expectedCtc: 1_700_000,
    },
    sections: {
      experience: [
        {
          title: 'Technical Writer',
          companyName: 'Openframe',
          description:
            'Rewrote an API reference that had been generated and abandoned. Support tickets about it fell by half.',
          startDate: '2021-05-01',
          isCurrent: true,
          skills: ['Technical Writing', 'APIs'],
        },
      ],
      education: [
        {
          college: 'Fergusson College',
          course: 'English Literature',
          degree: 'B.A.',
          startDate: '2014-07-01',
          endDate: '2017-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('neel@example.com', 'Neel', 'Chatterjee'),
    profile: {
      currentLocation: 'Bengaluru',
      preferredLocations: ['Bengaluru', 'Remote'],
      skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Event Sourcing'],
      jobTypes: ['full_time'],
      currentCtc: 1_900_000,
      expectedCtc: 2_900_000,
    },
    sections: {
      experience: [
        {
          title: 'Backend Engineer',
          companyName: 'Ledgerline',
          description:
            'Loan origination, where every state transition has an auditor attached to it. Event sourcing earned its keep.',
          startDate: '2020-10-01',
          isCurrent: true,
          skills: ['Node.js', 'TypeScript', 'Event Sourcing'],
        },
      ],
      education: [
        {
          college: 'Jadavpur University',
          course: 'Information Technology',
          degree: 'B.E.',
          startDate: '2015-08-01',
          endDate: '2019-05-31',
          isCurrent: false,
        },
      ],
    },
  },
  {
    account: account('zoya@example.com', 'Zoya', 'Khan'),
    profile: {
      currentLocation: 'Pune',
      preferredLocations: ['Pune', 'Remote'],
      skills: ['JavaScript', 'Git', 'React'],
      jobTypes: ['internship', 'full_time'],
      expectedCtc: 600_000,
    },
    sections: {
      education: [
        {
          college: 'MIT World Peace University',
          course: 'Computer Science',
          degree: 'B.Tech',
          startDate: '2022-08-01',
          isCurrent: true,
        },
      ],
      projects: [
        {
          title: 'Campus lost and found',
          description:
            'A small React app the college actually uses. Learned more from its bug reports than from any tutorial.',
          skills: ['React', 'JavaScript'],
          startDate: '2024-01-01',
          isCurrent: true,
        },
      ],
    },
  },
];
