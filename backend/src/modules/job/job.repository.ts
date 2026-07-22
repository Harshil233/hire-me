import type { FilterQuery, Model } from 'mongoose';

import type { JobStatus } from '../../config/constants';
import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { JobDocument } from '../../database/models/job.model';
import type {
  CreateJobData,
  IJobRepository,
  IJobSummaryProvider,
  Job,
  JobFilter,
  JobSummary,
  Page,
} from './job.interface';
import type { UpdateJobInput } from './job.schema';

/** The only place the jobs collection is touched (CLAUDE.md §6). */
export class JobRepository implements IJobRepository, IJobSummaryProvider {
  constructor(private readonly model: Model<JobDocument>) {}

  async findById(id: string): Promise<Job | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.model.findById(objectId).lean<JobDocument | null>().exec();
    return document === null ? null : JobRepository.toDomain(document);
  }

  async findSummaryById(id: string): Promise<JobSummary | null> {
    const job = await this.findById(id);

    if (job === null) {
      return null;
    }

    return { id: job.id, companyId: job.companyId, status: job.status, title: job.title };
  }

  async search(filter: JobFilter, page: number, pageSize: number): Promise<Page<Job>> {
    const query = this.buildFilter(filter);

    const [documents, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<JobDocument[]>()
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return { items: documents.map((document) => JobRepository.toDomain(document)), total };
  }

  async create(data: CreateJobData): Promise<Job> {
    const [created] = await this.model.create([
      {
        ...data,
        companyId: toObjectId(data.companyId),
        postedByUserId: toObjectId(data.postedByUserId),
      },
    ]);

    if (created === undefined) {
      throw new Error('Job insert returned no document');
    }

    return JobRepository.toDomain(created.toObject<JobDocument>());
  }

  async update(id: string, data: UpdateJobInput): Promise<Job | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.model
      .findOneAndUpdate({ _id: objectId }, { $set: data }, { new: true })
      .lean<JobDocument | null>()
      .exec();

    return document === null ? null : JobRepository.toDomain(document);
  }

  async setStatus(id: string, status: JobStatus, at: Date): Promise<Job | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    // Stamp the moment a listing went live or was taken down, without clearing the other.
    const timestamps: Record<string, Date> = {};
    if (status === 'published') {
      timestamps.publishedAt = at;
    }
    if (status === 'closed') {
      timestamps.closedAt = at;
    }

    const document = await this.model
      .findOneAndUpdate({ _id: objectId }, { $set: { status, ...timestamps } }, { new: true })
      .lean<JobDocument | null>()
      .exec();

    return document === null ? null : JobRepository.toDomain(document);
  }

  /**
   * Translates the validated filter into a Mongo query, one whitelisted field at a time.
   * The parsed object is never spread into the query, so no client-supplied key or
   * operator can reach the driver (CLAUDE.md §6).
   */
  private buildFilter(filter: JobFilter): FilterQuery<JobDocument> {
    const query: FilterQuery<JobDocument> = {};

    if (filter.status !== undefined) {
      query.status = filter.status;
    }

    if (filter.companyId !== undefined) {
      const companyId = toObjectIdOrNull(filter.companyId);
      // A malformed id must match nothing rather than every document.
      query.companyId = companyId ?? toObjectId('000000000000000000000000');
    }

    if (filter.role !== undefined) {
      query.role = filter.role;
    }

    if (filter.jobType !== undefined) {
      query.jobType = filter.jobType;
    }

    if (filter.workMode !== undefined) {
      query.workMode = filter.workMode;
    }

    if (filter.location !== undefined) {
      query.locations = new RegExp(`^${JobRepository.escapeRegex(filter.location)}$`, 'i');
    }

    if (filter.skills !== undefined && filter.skills.length > 0) {
      query.skills = {
        $in: filter.skills.map(
          (skill) => new RegExp(`^${JobRepository.escapeRegex(skill)}$`, 'i'),
        ),
      };
    }

    // Range overlap, not equality: "pays at least X" keeps jobs whose ceiling clears X,
    // and open-ended listings (no ceiling recorded) stay in the results.
    if (filter.minCtc !== undefined) {
      query.$or = [{ ctcMax: { $gte: filter.minCtc } }, { ctcMax: { $exists: false } }];
    }

    // "I have N years" keeps jobs asking for no more than N, plus those with no floor.
    if (filter.maxExperienceYears !== undefined) {
      query.$and = [
        {
          $or: [
            { experienceMinYears: { $lte: filter.maxExperienceYears } },
            { experienceMinYears: { $exists: false } },
          ],
        },
      ];
    }

    if (filter.search !== undefined) {
      query.$text = { $search: filter.search };
    }

    return query;
  }

  /** Neutralises regex metacharacters so a filter value cannot alter the pattern. */
  private static escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static toDomain(document: JobDocument): Job {
    return {
      id: toIdString(document._id),
      companyId: toIdString(document.companyId),
      postedByUserId: toIdString(document.postedByUserId),
      title: document.title,
      description: document.description,
      role: document.role,
      jobType: document.jobType,
      workMode: document.workMode,
      skills: document.skills,
      locations: document.locations,
      ctcMin: document.ctcMin,
      ctcMax: document.ctcMax,
      experienceMinYears: document.experienceMinYears,
      experienceMaxYears: document.experienceMaxYears,
      status: document.status,
      publishedAt: document.publishedAt,
      closedAt: document.closedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
