import type { Model } from 'mongoose';

import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import {
  MongooseUserScopedRepository,
  fileReferenceTransformers,
} from '../../common/persistence/mongoose-user-scoped.repository';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type { CandidateProfileDocument } from '../../database/models/candidate-profile.model';
import type { CandidateProfile, ICandidateProfileRepository } from './candidate.interface';
import type { CreateCandidateProfileInput, UpdateCandidateProfileInput } from './candidate.schema';

export class CandidateProfileRepository
  extends MongooseUserScopedRepository<
    CandidateProfile,
    CandidateProfileDocument,
    UpdateCandidateProfileInput
  >
  implements ICandidateProfileRepository
{
  constructor(model: Model<CandidateProfileDocument>) {
    super(model, fileReferenceTransformers('profilePicFileId', 'resumeFileId'));
  }

  async findManyByUserIds(userIds: readonly string[]): Promise<CandidateProfile[]> {
    const objectIds = userIds
      .map((id) => toObjectIdOrNull(id))
      .filter((id): id is NonNullable<typeof id> => id !== null);

    if (objectIds.length === 0) {
      return [];
    }

    const documents = await this.model
      .find({ userId: { $in: objectIds } })
      .lean<CandidateProfileDocument[]>()
      .exec();

    return documents.map((document) => this.toDomain(document));
  }

  async create(
    userId: string,
    data: CreateCandidateProfileInput,
    context?: TransactionContext,
  ): Promise<CandidateProfile> {
    return this.insert(
      { ...data, userId: toObjectId(userId), preferredLocations: [], skills: [], jobTypes: [] },
      context,
    );
  }

  protected toDomain(document: CandidateProfileDocument): CandidateProfile {
    return {
      id: toIdString(document._id),
      userId: toIdString(document.userId),
      firstName: document.firstName,
      middleName: document.middleName,
      lastName: document.lastName,
      profilePicFileId:
        document.profilePicFileId === undefined ? undefined : toIdString(document.profilePicFileId),
      mobile:
        document.mobile === undefined
          ? undefined
          : { countryCode: document.mobile.countryCode, number: document.mobile.number },
      gender: document.gender,
      dob: document.dob,
      currentLocation: document.currentLocation,
      preferredLocations: document.preferredLocations,
      skills: document.skills,
      jobTypes: document.jobTypes,
      currentCtc: document.currentCtc,
      expectedCtc: document.expectedCtc,
      resumeFileId:
        document.resumeFileId === undefined ? undefined : toIdString(document.resumeFileId),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
