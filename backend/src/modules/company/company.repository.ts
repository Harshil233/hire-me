import type { Model } from 'mongoose';

import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { getSession } from '../../database/mongoose-transaction-manager';
import type { CompanyDocument } from '../../database/models/company.model';
import type { Company, CreateCompanyData, ICompanyRepository } from './company.interface';
import type { UpdateCompanyInput } from './company.schema';

export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly model: Model<CompanyDocument>) {}

  async findById(id: string): Promise<Company | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.model.findById(objectId).lean<CompanyDocument | null>().exec();
    return document === null ? null : CompanyRepository.toDomain(document);
  }

  async findManyByIds(ids: readonly string[]): Promise<Company[]> {
    const objectIds = ids
      .map((id) => toObjectIdOrNull(id))
      .filter((id): id is NonNullable<typeof id> => id !== null);

    if (objectIds.length === 0) {
      return [];
    }

    const documents = await this.model
      .find({ _id: { $in: objectIds } })
      .lean<CompanyDocument[]>()
      .exec();

    return documents.map((document) => CompanyRepository.toDomain(document));
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return (await this.model.exists({ slug }).exec()) !== null;
  }

  async existsByDomain(domain: string): Promise<boolean> {
    return (await this.model.exists({ domain }).exec()) !== null;
  }

  async create(data: CreateCompanyData, context?: TransactionContext): Promise<Company> {
    const session = getSession(context);
    const { logoFileId, createdByUserId, ...rest } = data;

    const [created] = await this.model.create(
      [
        {
          ...rest,
          createdByUserId: toObjectId(createdByUserId),
          ...(logoFileId !== undefined ? { logoFileId: toObjectId(logoFileId) } : {}),
        },
      ],
      { session },
    );

    if (created === undefined) {
      throw new Error('Company insert returned no document');
    }

    return CompanyRepository.toDomain(created.toObject<CompanyDocument>());
  }

  async update(id: string, data: UpdateCompanyInput): Promise<Company | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const { logoFileId, ...rest } = data;
    const document = await this.model
      .findOneAndUpdate(
        { _id: objectId },
        {
          $set: {
            ...rest,
            ...(logoFileId !== undefined ? { logoFileId: toObjectId(logoFileId) } : {}),
          },
        },
        { new: true },
      )
      .lean<CompanyDocument | null>()
      .exec();

    return document === null ? null : CompanyRepository.toDomain(document);
  }

  private static toDomain(document: CompanyDocument): Company {
    return {
      id: toIdString(document._id),
      name: document.name,
      slug: document.slug,
      description: document.description,
      locations: document.locations,
      headquarters: document.headquarters,
      domain: document.domain,
      logoFileId: document.logoFileId === undefined ? undefined : toIdString(document.logoFileId),
      websiteUrl: document.websiteUrl,
      linkedinUrl: document.linkedinUrl,
      facebookUrl: document.facebookUrl,
      instagramUrl: document.instagramUrl,
      googleMapsLink: document.googleMapsLink,
      address: document.address,
      createdByUserId: toIdString(document.createdByUserId),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
