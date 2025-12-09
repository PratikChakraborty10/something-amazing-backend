import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { ContactList } from './entities/contact-list.entity';
import { ContactListMember } from './entities/contact-list-member.entity';
import { Contact } from '../contacts/entities/contact.entity';
import {
  CreateListDto,
  UpdateListDto,
  ManageContactsDto,
  QueryListsDto,
  QueryListDto,
} from './dto';

/**
 * List response with computed counts
 */
export interface ListWithStats {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  contactCount: number;
  validCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List with contacts response
 */
export interface ListWithContacts extends ListWithStats {
  contacts?: {
    data: Contact[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class ContactListsService {
  constructor(
    @InjectRepository(ContactList)
    private readonly listRepository: Repository<ContactList>,
    @InjectRepository(ContactListMember)
    private readonly memberRepository: Repository<ContactListMember>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  /**
   * Create a new contact list with optional initial contacts
   */
  async create(userId: string, dto: CreateListDto): Promise<ListWithStats> {
    // Create the list
    const list = this.listRepository.create({
      userId,
      name: dto.name,
      description: dto.description || null,
      tags: dto.tags || [],
    });

    const savedList = await this.listRepository.save(list);

    // Add initial contacts if provided
    let contactCount = 0;
    let validCount = 0;

    if (dto.contactIds && dto.contactIds.length > 0) {
      // Verify contacts belong to user
      const contacts = await this.contactRepository.find({
        where: {
          id: In(dto.contactIds),
          userId,
        },
      });

      // Create memberships
      const members = contacts.map((contact) =>
        this.memberRepository.create({
          listId: savedList.id,
          contactId: contact.id,
        }),
      );

      if (members.length > 0) {
        await this.memberRepository.save(members);
      }

      contactCount = contacts.length;
      validCount = contacts.filter((c) => c.status === 'valid').length;
    }

    return {
      id: savedList.id,
      name: savedList.name,
      description: savedList.description,
      tags: savedList.tags,
      contactCount,
      validCount,
      createdAt: savedList.createdAt,
      updatedAt: savedList.updatedAt,
    };
  }

  /**
   * Find all contact lists with computed stats
   */
  async findAll(userId: string, query: QueryListsDto): Promise<{ lists: ListWithStats[] }> {
    const queryBuilder = this.listRepository
      .createQueryBuilder('list')
      .where('list.userId = :userId', { userId });

    // Search filter
    if (query.search) {
      queryBuilder.andWhere(
        '(list.name ILIKE :search OR list.description ILIKE :search OR :search = ANY(list.tags))',
        { search: `%${query.search}%` },
      );
    }

    queryBuilder.orderBy('list.createdAt', 'DESC');

    const lists = await queryBuilder.getMany();

    // Get stats for each list
    const listsWithStats = await Promise.all(
      lists.map(async (list) => {
        const stats = await this.getListStats(list.id);
        return {
          id: list.id,
          name: list.name,
          description: list.description,
          tags: list.tags,
          contactCount: stats.contactCount,
          validCount: stats.validCount,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
        };
      }),
    );

    return { lists: listsWithStats };
  }

  /**
   * Get stats for a list (contact count, valid count)
   */
  private async getListStats(
    listId: string,
  ): Promise<{ contactCount: number; validCount: number }> {
    const result = await this.memberRepository
      .createQueryBuilder('member')
      .innerJoin('member.contact', 'contact')
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(CASE WHEN contact.status = 'valid' THEN 1 END)", 'valid')
      .where('member.listId = :listId', { listId })
      .getRawOne();

    return {
      contactCount: parseInt(result?.total || '0', 10),
      validCount: parseInt(result?.valid || '0', 10),
    };
  }

  /**
   * Find a single list with optional contacts
   */
  async findOne(
    userId: string,
    id: string,
    query: QueryListDto,
  ): Promise<ListWithContacts> {
    const list = await this.listRepository.findOne({
      where: { id, userId },
    });

    if (!list) {
      throw new NotFoundException('Contact list not found');
    }

    const stats = await this.getListStats(id);

    const result: ListWithContacts = {
      id: list.id,
      name: list.name,
      description: list.description,
      tags: list.tags,
      contactCount: stats.contactCount,
      validCount: stats.validCount,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };

    // Include contacts if requested
    if (query.includeContacts !== false) {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const offset = (page - 1) * limit;

      const [members, total] = await this.memberRepository.findAndCount({
        where: { listId: id },
        relations: ['contact'],
        skip: offset,
        take: limit,
        order: { addedAt: 'DESC' },
      });

      const contacts = members
        .map((m) => m.contact)
        .filter((c): c is Contact => c !== null);

      result.contacts = {
        data: contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return result;
  }

  /**
   * Update a contact list
   */
  async update(userId: string, id: string, dto: UpdateListDto): Promise<ListWithStats> {
    const list = await this.listRepository.findOne({
      where: { id, userId },
    });

    if (!list) {
      throw new NotFoundException('Contact list not found');
    }

    // Update fields
    if (dto.name !== undefined) list.name = dto.name;
    if (dto.description !== undefined) list.description = dto.description || null;
    if (dto.tags !== undefined) list.tags = dto.tags;

    const savedList = await this.listRepository.save(list);
    const stats = await this.getListStats(id);

    return {
      id: savedList.id,
      name: savedList.name,
      description: savedList.description,
      tags: savedList.tags,
      contactCount: stats.contactCount,
      validCount: stats.validCount,
      createdAt: savedList.createdAt,
      updatedAt: savedList.updatedAt,
    };
  }

  /**
   * Delete a contact list (contacts remain in database)
   */
  async remove(userId: string, id: string): Promise<void> {
    const result = await this.listRepository.delete({ id, userId });

    if (result.affected === 0) {
      throw new NotFoundException('Contact list not found');
    }
  }

  /**
   * Add contacts to a list
   */
  async addContacts(
    userId: string,
    listId: string,
    dto: ManageContactsDto,
  ): Promise<{ added: number; alreadyInList: number }> {
    // Verify list belongs to user
    const list = await this.listRepository.findOne({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new NotFoundException('Contact list not found');
    }

    // Verify contacts belong to user
    const contacts = await this.contactRepository.find({
      where: {
        id: In(dto.contactIds),
        userId,
      },
    });

    // Get existing memberships
    const existingMembers = await this.memberRepository.find({
      where: {
        listId,
        contactId: In(dto.contactIds),
      },
    });

    const existingContactIds = new Set(existingMembers.map((m) => m.contactId));

    // Create new memberships
    const newMembers = contacts
      .filter((c) => !existingContactIds.has(c.id))
      .map((c) =>
        this.memberRepository.create({
          listId,
          contactId: c.id,
        }),
      );

    if (newMembers.length > 0) {
      await this.memberRepository.save(newMembers);
    }

    // Update list's updatedAt
    list.updatedAt = new Date();
    await this.listRepository.save(list);

    return {
      added: newMembers.length,
      alreadyInList: existingMembers.length,
    };
  }

  /**
   * Remove contacts from a list
   */
  async removeContacts(
    userId: string,
    listId: string,
    dto: ManageContactsDto,
  ): Promise<{ removed: number }> {
    // Verify list belongs to user
    const list = await this.listRepository.findOne({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new NotFoundException('Contact list not found');
    }

    const result = await this.memberRepository
      .createQueryBuilder()
      .delete()
      .where('listId = :listId', { listId })
      .andWhere('contactId IN (:...contactIds)', { contactIds: dto.contactIds })
      .execute();

    // Update list's updatedAt
    list.updatedAt = new Date();
    await this.listRepository.save(list);

    return { removed: result.affected || 0 };
  }

  /**
   * Export list contacts as CSV
   */
  async exportCsv(userId: string, listId: string): Promise<{ csv: string; filename: string }> {
    const list = await this.listRepository.findOne({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new NotFoundException('Contact list not found');
    }

    // Get all contacts in the list
    const members = await this.memberRepository.find({
      where: { listId },
      relations: ['contact'],
    });

    const contacts = members
      .map((m) => m.contact)
      .filter((c): c is Contact => c !== null);

    // Generate CSV
    const headers = ['Email', 'First Name', 'Last Name', 'Company', 'Role', 'Tags', 'Status'];
    const rows = contacts.map((contact) => {
      return [
        this.escapeCsvField(contact.email),
        this.escapeCsvField(contact.firstName || ''),
        this.escapeCsvField(contact.lastName || ''),
        this.escapeCsvField(contact.company || ''),
        this.escapeCsvField(contact.role || ''),
        this.escapeCsvField(contact.tags.join(';')),
        this.escapeCsvField(contact.status),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;

    return { csv, filename };
  }

  /**
   * Escape a field for CSV format
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
