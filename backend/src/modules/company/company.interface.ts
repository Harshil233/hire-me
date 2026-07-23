import type { CompanyRole } from '../../config/constants';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { CreateCompanyInput, UpdateCompanyInput } from './company.schema';

export interface Company {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string | undefined;
  readonly locations: readonly string[];
  readonly headquarters?: string | undefined;
  readonly domain?: string | undefined;
  readonly logoFileId?: string | undefined;
  readonly websiteUrl?: string | undefined;
  readonly linkedinUrl?: string | undefined;
  readonly facebookUrl?: string | undefined;
  readonly instagramUrl?: string | undefined;
  readonly googleMapsLink?: string | undefined;
  readonly address?: string | undefined;
  readonly createdByUserId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Persistence input — the service adds the slug and the creator. */
export interface CreateCompanyData extends CreateCompanyInput {
  readonly slug: string;
  readonly createdByUserId: string;
}

export interface ICompanyRepository {
  findById(id: string): Promise<Company | null>;
  /** Batched read so a page of results never turns into one query per row. */
  findManyByIds(ids: readonly string[]): Promise<Company[]>;
  /** Name match, used so a job search can also find an employer by name. */
  searchByName(term: string): Promise<Company[]>;
  existsBySlug(slug: string): Promise<boolean>;
  existsByDomain(domain: string): Promise<boolean>;
  create(data: CreateCompanyData, context?: TransactionContext): Promise<Company>;
  update(id: string, data: UpdateCompanyInput): Promise<Company | null>;
}

/**
 * Membership port implemented by the HR module. Lets the company module answer
 * "who may manage this company?" without ever importing `hr_profiles`.
 */
export interface ICompanyMembership {
  findCompanyIdForUser(userId: string): Promise<string | null>;
  attachCompany(
    userId: string,
    companyId: string,
    role: CompanyRole,
    context?: TransactionContext,
  ): Promise<void>;
  canManageCompany(userId: string, companyId: string): Promise<boolean>;
}

export interface ICompanyService {
  /** Used inside an existing transaction by HR registration. */
  create(
    input: CreateCompanyInput,
    createdByUserId: string,
    context?: TransactionContext,
  ): Promise<Company>;
  /** Used by `POST /company/register` for an HR that has no company yet. */
  registerForUser(userId: string, input: CreateCompanyInput): Promise<Company>;
  getById(id: string): Promise<Company>;
  update(id: string, actorUserId: string, input: UpdateCompanyInput): Promise<Company>;
}

export const COMPANY_REPOSITORY: Token<ICompanyRepository> = createToken('ICompanyRepository');
export const COMPANY_SERVICE: Token<ICompanyService> = createToken('ICompanyService');
export const COMPANY_MEMBERSHIP: Token<ICompanyMembership> = createToken('ICompanyMembership');
