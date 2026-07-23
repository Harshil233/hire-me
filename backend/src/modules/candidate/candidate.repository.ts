import type { FilterQuery, Model } from 'mongoose';

import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import {
  MongooseUserScopedRepository,
  fileReferenceTransformers,
} from '../../common/persistence/mongoose-user-scoped.repository';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type { CandidateProfileDocument } from '../../database/models/candidate-profile.model';
import type { Page } from '../../common/persistence/page';
import { escapeRegex } from '../../common/utils/regex';
import type {
  CandidateFilter,
  CandidateProfile,
  ICandidateProfileRepository,
} from './candidate.interface';
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

  async search(
    filter: CandidateFilter,
    page: number,
    pageSize: number,
  ): Promise<Page<CandidateProfile>> {
    const query = CandidateProfileRepository.buildFilter(filter);

    const [documents, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<CandidateProfileDocument[]>()
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return { items: documents.map((document) => this.toDomain(document)), total };
  }

  /**
   * Translates the validated filter into a Mongo query one whitelisted field at a time.
   * The parsed object is never spread in, so no client key or operator reaches the
   * driver, and every value is escaped before it becomes a pattern.
   */
  private static buildFilter(filter: CandidateFilter): FilterQuery<CandidateProfileDocument> {
    const query: FilterQuery<CandidateProfileDocument> = {};
    const and: FilterQuery<CandidateProfileDocument>[] = [];

    if (filter.search !== undefined) {
      const term = new RegExp(escapeRegex(filter.search), 'i');
      // A single box that searches the name, the skills and either location.
      and.push({
        $or: [
          { firstName: term },
          { lastName: term },
          { skills: term },
          { currentLocation: term },
          { preferredLocations: term },
        ],
      });
    }

    if (filter.skills !== undefined && filter.skills.length > 0) {
      query.skills = {
        $in: filter.skills.map(
          (skill) => new RegExp(`^${escapeRegex(skill)}$`, 'i'),
        ),
      };
    }

    if (filter.location !== undefined) {
      const location = new RegExp(
        `^${escapeRegex(filter.location)}$`,
        'i',
      );
      and.push({ $or: [{ currentLocation: location }, { preferredLocations: location }] });
    }

    if (filter.jobType !== undefined) {
      query.jobTypes = filter.jobType;
    }

    if (and.length > 0) {
      query.$and = and;
    }

    return query;
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
