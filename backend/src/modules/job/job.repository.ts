import type { FilterQuery, Model } from 'mongoose';

import { JOB_STATUSES, type JobStatus } from '../../config/constants';
import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { Page } from '../../common/persistence/page';
import { escapeRegex } from '../../common/utils/regex';
import { matchEverySearchWord } from '../../common/persistence/search-query';
import type { JobDocument } from '../../database/models/job.model';
import type {
  CreateJobData,
  IJobRepository,
  IJobSummaryProvider,
  Job,
  JobFilter,
  JobSummary,
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

  async findManyByIds(ids: readonly string[]): Promise<Job[]> {
    const objectIds = ids
      .map((id) => toObjectIdOrNull(id))
      .filter((id): id is NonNullable<typeof id> => id !== null);

    if (objectIds.length === 0) {
      return [];
    }

    const documents = await this.model
      .find({ _id: { $in: objectIds } })
      .lean<JobDocument[]>()
      .exec();

    return documents.map((document) => JobRepository.toDomain(document));
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

  /**
   * Counted rather than merely collected: a filter is more useful when the skills a
   * hundred listings ask for come before the one a single listing mentions.
   *
   * Grouped case-insensitively, because "TypeScript" and "Typescript" are one skill to
   * everyone but the database, and offering both as separate boxes reads as a bug. The
   * spelling shown is the one from the most recent listing to ask for it.
   */
  async listPublishedSkills(limit: number): Promise<string[]> {
    const rows = await this.model
      .aggregate<{ label: string }>([
        { $match: { status: JOB_STATUSES.PUBLISHED } },
        { $unwind: '$skills' },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { $toLower: '$skills' },
            label: { $first: '$skills' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
      ])
      .exec();

    return rows.map((row) => row.label);
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
    // Conditions that are themselves an `$or` are collected here, because several of
    // them can apply at once and a bare `query.$or` would let the last one win.
    const and: FilterQuery<JobDocument>[] = [];

    if (filter.status !== undefined) {
      query.status = filter.status;
    }

    if (filter.companyId !== undefined) {
      const companyId = toObjectIdOrNull(filter.companyId);
      // A malformed id must match nothing rather than every document.
      query.companyId = companyId ?? JobRepository.IMPOSSIBLE_ID;
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
      query.locations = new RegExp(`^${escapeRegex(filter.location)}$`, 'i');
    }

    if (filter.skills !== undefined && filter.skills.length > 0) {
      query.skills = {
        $in: filter.skills.map(
          (skill) => new RegExp(`^${escapeRegex(skill)}$`, 'i'),
        ),
      };
    }

    // Range overlap, not equality: "pays at least X" keeps jobs whose ceiling clears X,
    // and open-ended listings (no ceiling recorded) stay in the results.
    if (filter.minCtc !== undefined) {
      and.push({
        $or: [{ ctcMax: { $gte: filter.minCtc } }, { ctcMax: { $exists: false } }],
      });
    }

    // "I have N years" keeps jobs asking for no more than N, plus those with no floor.
    if (filter.maxExperienceYears !== undefined) {
      and.push({
        $or: [
          { experienceMinYears: { $lte: filter.maxExperienceYears } },
          { experienceMinYears: { $exists: false } },
        ],
      });
    }

    /*
     * One search box spanning the title, the description, the skills, the locations, the
     * role and the employer's name. Regex rather than a text index because `$text` may
     * not appear inside `$or`, and matching the company requires exactly that.
     */
    if (filter.search !== undefined) {
      // Every word must land somewhere, so "backend pune" matches a title plus a
      // location rather than being hunted for as one string in each field.
      and.push(
        ...matchEverySearchWord<FilterQuery<JobDocument>>(filter.search, (term, word) => {
          const alternatives: FilterQuery<JobDocument>[] = [
            { title: term },
            { description: term },
            { skills: term },
            { locations: term },
            { role: term },
          ];

          const companyIds = filter.searchCompanyIds?.get(word) ?? [];
          if (companyIds.length > 0) {
            alternatives.push({ companyId: { $in: companyIds.map((id) => toObjectId(id)) } });
          }

          return alternatives;
        }),
      );
    }

    if (and.length > 0) {
      query.$and = and;
    }

    return query;
  }

  /** A well-formed id that no document will ever carry. */
  private static readonly IMPOSSIBLE_ID = toObjectId('000000000000000000000000');


  private static toDomain(document: JobDocument): Job {
    return {
      id: toIdString(document._id),
      companyId: toIdString(document.companyId),
      postedByUserId: toIdString(document.postedByUserId),
      title: document.title,
      description: document.description,
      // Documents written before these fields existed carry none, and the domain type
      // promises arrays either way.
      highlights: document.highlights ?? [],
      responsibilities: document.responsibilities ?? [],
      qualifications: document.qualifications ?? [],
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
