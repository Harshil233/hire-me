import { SEED_PASSWORD } from './seed.password';
import type { SeedHr } from './seed.types';

/** Employers, each with the company created alongside the account. */
export const SEED_HRS: readonly SeedHr[] = [
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
  {
    email: 'priya@vertexhealth.test',
    password: SEED_PASSWORD,
    firstName: 'Priya',
    lastName: 'Krishnan',
    designation: 'Director of People',
    company: {
      name: 'Vertex Health',
      domain: 'vertexhealth.test',
      headquarters: 'Chennai',
      locations: ['Chennai', 'Bengaluru', 'Remote'],
      description:
        'Clinical software for hospital networks. Regulated, audited, and used by people who cannot afford for it to be down.',
      websiteUrl: 'https://vertexhealth.test',
    },
  },
  {
    email: 'daniel@orbitfintech.test',
    password: SEED_PASSWORD,
    firstName: 'Daniel',
    lastName: 'Abraham',
    designation: 'Head of Engineering Recruitment',
    company: {
      name: 'Orbit Fintech',
      domain: 'orbitfintech.test',
      headquarters: 'Gurugram',
      locations: ['Gurugram', 'Bengaluru', 'Remote'],
      description:
        'Payments and lending infrastructure for businesses that outgrew their spreadsheets. Correctness first, everywhere.',
      websiteUrl: 'https://orbitfintech.test',
    },
  },
  {
    email: 'anika@lumenstudios.test',
    password: SEED_PASSWORD,
    firstName: 'Anika',
    lastName: 'Desai',
    designation: 'Studio Producer',
    company: {
      name: 'Lumen Studios',
      domain: 'lumenstudios.test',
      headquarters: 'Goa',
      locations: ['Goa', 'Remote'],
      description:
        'A small product studio doing brand, interface and motion work for companies that care how things feel.',
      websiteUrl: 'https://lumenstudios.test',
    },
  },
];
