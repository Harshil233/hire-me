import type { Model } from 'mongoose';

import type { CompanyRole } from '../../config/constants';
import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import {
  MongooseUserScopedRepository,
  fileReferenceTransformers,
} from '../../common/persistence/mongoose-user-scoped.repository';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { getSession } from '../../database/mongoose-transaction-manager';
import type { HrProfileDocument } from '../../database/models/hr-profile.model';
import type { CreateHrProfileData, HrProfile, IHrProfileRepository } from './hr.interface';
import type { UpdateHrProfileInput } from './hr.schema';

export class HrProfileRepository
  extends MongooseUserScopedRepository<HrProfile, HrProfileDocument, UpdateHrProfileInput>
  implements IHrProfileRepository
{
  constructor(model: Model<HrProfileDocument>) {
    super(model, fileReferenceTransformers('profilePicFileId'));
  }

  async create(
    userId: string,
    data: CreateHrProfileData,
    context?: TransactionContext,
  ): Promise<HrProfile> {
    const { companyId, ...rest } = data;

    return this.insert(
      { ...rest, userId: toObjectId(userId), companyId: toObjectId(companyId) },
      context,
    );
  }

  async setCompany(
    userId: string,
    companyId: string,
    companyRole: CompanyRole,
    context?: TransactionContext,
  ): Promise<void> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return;
    }

    const session = getSession(context);

    await this.model
      .updateOne(
        { userId: objectId },
        { $set: { companyId: toObjectId(companyId), companyRole } },
        session === undefined ? {} : { session },
      )
      .exec();
  }

  protected toDomain(document: HrProfileDocument): HrProfile {
    return {
      id: toIdString(document._id),
      userId: toIdString(document.userId),
      companyId: document.companyId === undefined ? undefined : toIdString(document.companyId),
      companyRole: document.companyRole,
      firstName: document.firstName,
      middleName: document.middleName,
      lastName: document.lastName,
      designation: document.designation,
      profilePicFileId:
        document.profilePicFileId === undefined ? undefined : toIdString(document.profilePicFileId),
      mobile:
        document.mobile === undefined
          ? undefined
          : { countryCode: document.mobile.countryCode, number: document.mobile.number },
      gender: document.gender,
      dob: document.dob,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
