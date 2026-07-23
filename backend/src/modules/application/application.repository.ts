import type { FilterQuery, Model } from 'mongoose';

import type { ApplicationStatus } from '../../config/constants';
import type { Page } from '../../common/persistence/page';
import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { getSession } from '../../database/mongoose-transaction-manager';
import type { ApplicationDocument } from '../../database/models/application.model';
import type {
  Application,
  ApplicationFilter,
  CreateApplicationData,
  IApplicationRepository,
} from './application.interface';

/** The only place the applications collection is touched (CLAUDE.md §6). */
export class ApplicationRepository implements IApplicationRepository {
  constructor(private readonly model: Model<ApplicationDocument>) {}

  async findById(id: string): Promise<Application | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.model.findById(objectId).lean<ApplicationDocument | null>().exec();
    return document === null ? null : ApplicationRepository.toDomain(document);
  }

  async search(
    filter: ApplicationFilter,
    page: number,
    pageSize: number,
  ): Promise<Page<Application>> {
    const query = ApplicationRepository.buildFilter(filter);

    const [documents, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<ApplicationDocument[]>()
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      items: documents.map((document) => ApplicationRepository.toDomain(document)),
      total,
    };
  }

  /**
   * Relies on the unique `{ jobId, candidateUserId }` index to reject a second
   * application. The duplicate-key error surfaces as a 409 through the error middleware,
   * so two concurrent requests cannot both slip past a read-then-write check.
   */
  async create(data: CreateApplicationData): Promise<Application> {
    const [created] = await this.model.create([
      {
        jobId: toObjectId(data.jobId),
        candidateUserId: toObjectId(data.candidateUserId),
        statusUpdatedAt: data.statusUpdatedAt,
        ...(data.resumeFileId !== undefined
          ? { resumeFileId: toObjectId(data.resumeFileId) }
          : {}),
        ...(data.coverNote !== undefined ? { coverNote: data.coverNote } : {}),
      },
    ]);

    if (created === undefined) {
      throw new Error('Application insert returned no document');
    }

    return ApplicationRepository.toDomain(created.toObject<ApplicationDocument>());
  }

  async setStatus(
    id: string,
    status: ApplicationStatus,
    actorUserId: string,
    at: Date,
    context?: TransactionContext,
  ): Promise<Application | null> {
    const objectId = toObjectIdOrNull(id);
    const actorId = toObjectIdOrNull(actorUserId);
    if (objectId === null || actorId === null) {
      return null;
    }

    const session = getSession(context);
    const document = await this.model
      .findOneAndUpdate(
        { _id: objectId },
        { $set: { status, statusUpdatedAt: at, statusUpdatedByUserId: actorId } },
        { new: true, ...(session === undefined ? {} : { session }) },
      )
      .lean<ApplicationDocument | null>()
      .exec();

    return document === null ? null : ApplicationRepository.toDomain(document);
  }

  /**
   * Builds the Mongo query one whitelisted field at a time; the caller's filter object
   * is never spread into it. A malformed id matches nothing rather than everything.
   */
  private static buildFilter(filter: ApplicationFilter): FilterQuery<ApplicationDocument> {
    const query: FilterQuery<ApplicationDocument> = {};

    if (filter.jobId !== undefined) {
      query.jobId = toObjectIdOrNull(filter.jobId) ?? ApplicationRepository.IMPOSSIBLE_ID;
    }

    if (filter.candidateUserId !== undefined) {
      query.candidateUserId =
        toObjectIdOrNull(filter.candidateUserId) ?? ApplicationRepository.IMPOSSIBLE_ID;
    }

    if (filter.status !== undefined) {
      query.status = filter.status;
    }

    return query;
  }

  /** A well-formed id that no document will ever carry. */
  private static readonly IMPOSSIBLE_ID = toObjectId('000000000000000000000000');

  private static toDomain(document: ApplicationDocument): Application {
    return {
      id: toIdString(document._id),
      jobId: toIdString(document.jobId),
      candidateUserId: toIdString(document.candidateUserId),
      status: document.status,
      resumeFileId:
        document.resumeFileId === undefined ? undefined : toIdString(document.resumeFileId),
      coverNote: document.coverNote,
      statusUpdatedAt: document.statusUpdatedAt,
      statusUpdatedByUserId:
        document.statusUpdatedByUserId === undefined
          ? undefined
          : toIdString(document.statusUpdatedByUserId),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
