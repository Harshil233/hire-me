import { COMPANY_ROLES } from '../../config/constants';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type { ITransactionManager, TransactionContext } from '../../common/persistence/transaction.types';
import { slugify } from '../../common/utils/slugify';
import type {
  Company,
  ICompanyMembership,
  ICompanyRepository,
  ICompanyService,
} from './company.interface';
import type { CreateCompanyInput, UpdateCompanyInput } from './company.schema';

const SLUG_FALLBACK = 'company';
const MAX_SLUG_ATTEMPTS = 50;

export class CompanyService implements ICompanyService {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly membership: ICompanyMembership,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async create(
    input: CreateCompanyInput,
    createdByUserId: string,
    context?: TransactionContext,
  ): Promise<Company> {
    if (input.domain !== undefined && (await this.companyRepository.existsByDomain(input.domain))) {
      throw new ConflictError(
        'A company with this domain is already registered',
        ERROR_CODES.COMPANY_ALREADY_EXISTS,
      );
    }

    const slug = await this.generateUniqueSlug(input.name);
    return this.companyRepository.create({ ...input, slug, createdByUserId }, context);
  }

  async registerForUser(userId: string, input: CreateCompanyInput): Promise<Company> {
    const existingCompanyId = await this.membership.findCompanyIdForUser(userId);

    if (existingCompanyId !== null) {
      throw new ConflictError(
        'Your account is already linked to a company',
        ERROR_CODES.COMPANY_ALREADY_LINKED,
      );
    }

    return this.transactionManager.runInTransaction(async (context) => {
      const company = await this.create(input, userId, context);
      await this.membership.attachCompany(userId, company.id, COMPANY_ROLES.OWNER, context);
      return company;
    });
  }

  async getById(id: string): Promise<Company> {
    const company = await this.companyRepository.findById(id);

    if (company === null) {
      throw new NotFoundError('Company not found', ERROR_CODES.COMPANY_NOT_FOUND);
    }

    return company;
  }

  async update(id: string, actorUserId: string, input: UpdateCompanyInput): Promise<Company> {
    const company = await this.getById(id);

    if (!(await this.membership.canManageCompany(actorUserId, company.id))) {
      throw new ForbiddenError('Only a company owner can update these details');
    }

    if (
      input.domain !== undefined &&
      input.domain !== company.domain &&
      (await this.companyRepository.existsByDomain(input.domain))
    ) {
      throw new ConflictError(
        'A company with this domain is already registered',
        ERROR_CODES.COMPANY_ALREADY_EXISTS,
      );
    }

    const updated = await this.companyRepository.update(id, input);

    if (updated === null) {
      throw new NotFoundError('Company not found', ERROR_CODES.COMPANY_NOT_FOUND);
    }

    return updated;
  }

  /** `acme`, then `acme-2`, `acme-3`, … — deterministic and therefore testable. */
  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || SLUG_FALLBACK;

    for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      if (!(await this.companyRepository.existsBySlug(candidate))) {
        return candidate;
      }
    }

    throw new ConflictError(
      'Could not derive a unique company identifier, please adjust the name',
      ERROR_CODES.COMPANY_ALREADY_EXISTS,
    );
  }
}
