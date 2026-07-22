import type { CompanyRole, Gender } from '../../config/constants';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type { MobileInput } from '../../common/validation/fields';
import { createToken, type Token } from '../../container/token';
import type { CreateHrProfileInput, UpdateHrProfileInput } from './hr.schema';

export interface HrProfile {
  readonly id: string;
  readonly userId: string;
  /** `undefined` until a company is linked (see `POST /company/register`). */
  readonly companyId?: string | undefined;
  readonly companyRole: CompanyRole;
  readonly firstName: string;
  readonly middleName?: string | undefined;
  readonly lastName: string;
  readonly designation?: string | undefined;
  readonly profilePicFileId?: string | undefined;
  readonly mobile?: MobileInput | undefined;
  readonly gender?: Gender | undefined;
  readonly dob?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateHrProfileData extends CreateHrProfileInput {
  readonly companyId: string;
  readonly companyRole: CompanyRole;
}

export interface IHrProfileRepository {
  findByUserId(userId: string): Promise<HrProfile | null>;
  create(
    userId: string,
    data: CreateHrProfileData,
    context?: TransactionContext,
  ): Promise<HrProfile>;
  update(userId: string, data: UpdateHrProfileInput): Promise<HrProfile | null>;
  setCompany(
    userId: string,
    companyId: string,
    companyRole: CompanyRole,
    context?: TransactionContext,
  ): Promise<void>;
}

export interface IHrProfileService {
  createForUser(
    userId: string,
    data: CreateHrProfileData,
    context?: TransactionContext,
  ): Promise<HrProfile>;
  getByUserId(userId: string): Promise<HrProfile>;
  update(userId: string, data: UpdateHrProfileInput): Promise<HrProfile>;
}

export const HR_PROFILE_REPOSITORY: Token<IHrProfileRepository> =
  createToken('IHrProfileRepository');
export const HR_PROFILE_SERVICE: Token<IHrProfileService> = createToken('IHrProfileService');
