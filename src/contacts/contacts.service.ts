import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Contact } from './entities/contact.entity';
import {
  CreateContactDto,
  UpdateContactDto,
  BulkImportDto,
  BulkDeleteDto,
  QueryContactsDto,
  DedupeStrategy,
  ContactStatusFilter,
  ContactSortBy,
} from './dto';

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Result of bulk import operation
 */
export interface BulkImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  contacts: Contact[];
  errors: Array<{ row: number; email: string; reason: string }>;
}

/**
 * Contact statistics
 */
export interface ContactStats {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  topDomains: Array<{ domain: string; count: number }>;
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
  }

  /**
   * Determine contact status based on validation
   */
  private determineStatus(
    email: string,
  ): { status: 'valid' | 'invalid'; errors: string[] } {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
      return { status: 'invalid', errors };
    }

    if (!this.isValidEmail(email)) {
      errors.push('Invalid email format');
      return { status: 'invalid', errors };
    }

    return { status: 'valid', errors: [] };
  }

  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : '';
  }

  /**
   * Create a single contact
   */
  async create(userId: string, dto: CreateContactDto): Promise<Contact> {
    const email = dto.email.toLowerCase().trim();
    const { status, errors } = this.determineStatus(email);

    // Check for existing contact with same email
    const existing = await this.contactRepository.findOne({
      where: { userId, email },
    });

    if (existing) {
      throw new ConflictException('Contact with this email already exists');
    }

    const contact = this.contactRepository.create({
      userId,
      email,
      firstName: dto.firstName || null,
      lastName: dto.lastName || null,
      company: dto.company || null,
      role: dto.role || null,
      tags: dto.tags || [],
      customMeta: dto.customMeta || {},
      status,
      validationErrors: errors,
    });

    return this.contactRepository.save(contact);
  }

  /**
   * Bulk import contacts with deduplication handling
   */
  async bulkImport(userId: string, dto: BulkImportDto): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      imported: 0,
      skipped: 0,
      duplicates: 0,
      contacts: [],
      errors: [],
    };

    if (!dto.contacts || dto.contacts.length === 0) {
      return result;
    }

    // Get all existing contacts for this user
    const existingContacts = await this.contactRepository.find({
      where: { userId },
    });
    const existingByEmail = new Map<string, Contact>();
    existingContacts.forEach((c) => existingByEmail.set(c.email, c));

    // Track contacts to save and duplicates within the import
    const toSave: Contact[] = [];
    const toUpdate: Contact[] = [];
    const seenInImport = new Map<string, { index: number; contact: Contact }>();

    for (let i = 0; i < dto.contacts.length; i++) {
      const item = dto.contacts[i];
      const email = item.email?.toLowerCase().trim();

      // Validate email
      const { status, errors } = this.determineStatus(email);
      if (status === 'invalid') {
        result.errors.push({ row: i + 1, email: email || '', reason: errors.join(', ') });
        result.skipped++;
        continue;
      }

      // Create contact object
      const contactData: Partial<Contact> = {
        userId,
        email,
        firstName: item.firstName || null,
        lastName: item.lastName || null,
        company: item.company || null,
        role: item.role || null,
        tags: item.tags || [],
        customMeta: {},
        status: 'valid',
        validationErrors: [],
      };

      // Check for duplicate within the import
      if (seenInImport.has(email)) {
        result.duplicates++;
        const existing = seenInImport.get(email)!;

        switch (dto.dedupeStrategy) {
          case DedupeStrategy.KEEP_FIRST:
            // Keep existing, skip new
            continue;
          case DedupeStrategy.KEEP_LAST:
            // Replace with new
            Object.assign(existing.contact, contactData);
            break;
          case DedupeStrategy.MERGE:
            // Merge fields
            this.mergeContacts(existing.contact, contactData);
            break;
        }
        continue;
      }

      // Check for existing in database
      if (existingByEmail.has(email)) {
        result.duplicates++;
        const existing = existingByEmail.get(email)!;

        switch (dto.dedupeStrategy) {
          case DedupeStrategy.KEEP_FIRST:
            // Keep existing, skip new
            continue;
          case DedupeStrategy.KEEP_LAST:
            // Update existing with new data
            Object.assign(existing, contactData);
            existing.updatedAt = new Date();
            toUpdate.push(existing);
            break;
          case DedupeStrategy.MERGE:
            // Merge fields
            this.mergeContacts(existing, contactData);
            existing.updatedAt = new Date();
            toUpdate.push(existing);
            break;
        }
        continue;
      }

      // New contact
      const contact = this.contactRepository.create(contactData);
      seenInImport.set(email, { index: i, contact });
      toSave.push(contact);
    }

    // Save new contacts
    if (toSave.length > 0) {
      const saved = await this.contactRepository.save(toSave);
      result.contacts.push(...saved);
      result.imported += saved.length;
    }

    // Update existing contacts
    if (toUpdate.length > 0) {
      const updated = await this.contactRepository.save(toUpdate);
      result.contacts.push(...updated);
      result.imported += updated.length;
    }

    return result;
  }

  /**
   * Merge two contacts (for merge dedup strategy)
   */
  private mergeContacts(existing: Contact | Partial<Contact>, newData: Partial<Contact>): void {
    if (newData.firstName) existing.firstName = newData.firstName;
    if (newData.lastName) existing.lastName = newData.lastName;
    if (newData.company) existing.company = newData.company;
    if (newData.role) existing.role = newData.role;
    if (newData.tags && newData.tags.length > 0) {
      existing.tags = [...new Set([...(existing.tags || []), ...newData.tags])];
    }
    if (newData.customMeta) {
      existing.customMeta = { ...(existing.customMeta || {}), ...newData.customMeta };
    }
  }

  /**
   * Find all contacts with pagination, filtering, and search
   */
  async findAll(
    userId: string,
    query: QueryContactsDto,
  ): Promise<{
    contacts: Contact[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 50, search, status, domain, sortBy, sortOrder } = query;

    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.userId = :userId', { userId });

    // Status filter
    if (status && status !== ContactStatusFilter.ALL) {
      queryBuilder.andWhere('contact.status = :status', { status });
    }

    // Domain filter
    if (domain) {
      queryBuilder.andWhere('contact.email LIKE :domain', { domain: `%@${domain}` });
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(contact.email ILIKE :search OR contact.firstName ILIKE :search OR contact.lastName ILIKE :search OR contact.company ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    const sortColumn =
      sortBy === ContactSortBy.EMAIL
        ? 'contact.email'
        : sortBy === ContactSortBy.UPDATED_AT
          ? 'contact.updatedAt'
          : 'contact.createdAt';
    queryBuilder.orderBy(sortColumn, sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const contacts = await queryBuilder.getMany();

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single contact by ID
   */
  async findOne(userId: string, id: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  /**
   * Update a contact
   */
  async update(userId: string, id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(userId, id);

    // If email is being updated, validate and check for duplicates
    if (dto.email) {
      const newEmail = dto.email.toLowerCase().trim();
      if (newEmail !== contact.email) {
        const existing = await this.contactRepository.findOne({
          where: { userId, email: newEmail },
        });
        if (existing) {
          throw new ConflictException('Contact with this email already exists');
        }
        contact.email = newEmail;

        // Revalidate
        const { status, errors } = this.determineStatus(newEmail);
        contact.status = status;
        contact.validationErrors = errors;
      }
    }

    // Update other fields
    if (dto.firstName !== undefined) contact.firstName = dto.firstName || null;
    if (dto.lastName !== undefined) contact.lastName = dto.lastName || null;
    if (dto.company !== undefined) contact.company = dto.company || null;
    if (dto.role !== undefined) contact.role = dto.role || null;
    if (dto.tags !== undefined) contact.tags = dto.tags;
    if (dto.customMeta !== undefined) contact.customMeta = dto.customMeta;

    return this.contactRepository.save(contact);
  }

  /**
   * Delete a single contact
   */
  async remove(userId: string, id: string): Promise<void> {
    const result = await this.contactRepository.delete({ id, userId });

    if (result.affected === 0) {
      throw new NotFoundException('Contact not found');
    }
  }

  /**
   * Delete multiple contacts
   */
  async bulkRemove(userId: string, dto: BulkDeleteDto): Promise<{ deleted: number }> {
    if (!dto.ids || dto.ids.length === 0) {
      return { deleted: 0 };
    }

    // Only delete contacts that belong to the user
    const result = await this.contactRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...ids)', { ids: dto.ids })
      .andWhere('userId = :userId', { userId })
      .execute();

    return { deleted: result.affected || 0 };
  }

  /**
   * Get contact statistics
   */
  async getStats(userId: string): Promise<ContactStats> {
    // Get counts by status
    const statusCounts = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('contact.userId = :userId', { userId })
      .groupBy('contact.status')
      .getRawMany();

    const stats: ContactStats = {
      total: 0,
      valid: 0,
      invalid: 0,
      duplicate: 0,
      topDomains: [],
    };

    statusCounts.forEach((row) => {
      const count = parseInt(row.count, 10);
      stats.total += count;
      if (row.status === 'valid') stats.valid = count;
      else if (row.status === 'invalid') stats.invalid = count;
      else if (row.status === 'duplicate') stats.duplicate = count;
    });

    // Get top 5 domains
    const domainCounts = await this.contactRepository
      .createQueryBuilder('contact')
      .select("SPLIT_PART(contact.email, '@', 2)", 'domain')
      .addSelect('COUNT(*)', 'count')
      .where('contact.userId = :userId', { userId })
      .groupBy('domain')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    stats.topDomains = domainCounts.map((row) => ({
      domain: row.domain,
      count: parseInt(row.count, 10),
    }));

    return stats;
  }

  /**
   * Find contacts by IDs (for contact lists)
   */
  async findByIds(userId: string, ids: string[]): Promise<Contact[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.contactRepository.find({
      where: {
        id: In(ids),
        userId,
      },
    });
  }
}
