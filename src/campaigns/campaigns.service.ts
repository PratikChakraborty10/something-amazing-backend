import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CampaignEvent } from './entities/campaign-event.entity';
import { ContactList } from '../contact-lists/entities/contact-list.entity';
import { ContactListMember } from '../contact-lists/entities/contact-list-member.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { SesService } from '../common/email/ses.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  QueryCampaignsDto,
  ScheduleCampaignDto,
  SendTestDto,
  CampaignStatusFilter,
  CampaignSortBy,
  SortOrder,
  SendType,
} from './dto';

/**
 * Campaign statistics for dashboard
 */
export interface CampaignStats {
  totalCampaigns: number;
  drafts: number;
  scheduled: number;
  sent: number;
  avgOpenRate: number;
  avgClickRate: number;
}

/**
 * Campaign analytics data
 */
export interface CampaignAnalytics {
  campaignId: string;
  overview: {
    recipients: number;
    delivered: number;
    deliveryRate: number;
    opened: number;
    openRate: number;
    clicked: number;
    clickRate: number;
    bounced: number;
    bounceRate: number;
    complained: number;
    complaintRate: number;
  };
  timeline: Array<{
    timestamp: Date;
    event: string;
    count: number;
  }>;
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignEvent)
    private readonly eventRepository: Repository<CampaignEvent>,
    @InjectRepository(ContactList)
    private readonly listRepository: Repository<ContactList>,
    @InjectRepository(ContactListMember)
    private readonly memberRepository: Repository<ContactListMember>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly emailService: SesService,
  ) {}

  /**
   * Create a new campaign
   */
  async create(userId: string, dto: CreateCampaignDto): Promise<Campaign> {
    // Validate contact lists if provided
    let lists: ContactList[] = [];
    let recipientCount = 0;

    if (dto.selectedListIds && dto.selectedListIds.length > 0) {
      lists = await this.listRepository.find({
        where: {
          id: In(dto.selectedListIds),
          userId,
        },
      });

      if (lists.length !== dto.selectedListIds.length) {
        throw new BadRequestException('One or more contact lists not found');
      }

      // Count unique recipients across all lists
      recipientCount = await this.countRecipientsFromLists(dto.selectedListIds);
    }

    const campaign = this.campaignRepository.create({
      userId,
      name: dto.name,
      description: dto.description || null,
      subject: dto.subject,
      preheader: dto.preheader || null,
      senderName: dto.senderName,
      senderEmail: dto.senderEmail,
      replyTo: dto.replyTo || null,
      sendType: dto.sendType || 'now',
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      status: 'draft',
      recipients: recipientCount,
      lists,
    });

    return this.campaignRepository.save(campaign);
  }

  /**
   * Count unique recipients from contact lists
   */
  private async countRecipientsFromLists(listIds: string[]): Promise<number> {
    if (listIds.length === 0) return 0;

    const result = await this.memberRepository
      .createQueryBuilder('member')
      .select('COUNT(DISTINCT member.contactId)', 'count')
      .where('member.listId IN (:...listIds)', { listIds })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  /**
   * Find all campaigns with pagination, filtering, and statistics
   */
  async findAll(
    userId: string,
    query: QueryCampaignsDto,
  ): Promise<{
    data: Campaign[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    stats: CampaignStats;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = CampaignSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const queryBuilder = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.lists', 'lists')
      .where('campaign.userId = :userId', { userId });

    // Status filter
    if (status && status !== CampaignStatusFilter.ALL) {
      queryBuilder.andWhere('campaign.status = :status', { status });
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(campaign.name ILIKE :search OR campaign.subject ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sorting
    const sortColumn = this.getSortColumn(sortBy);
    queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const campaigns = await queryBuilder.getMany();

    // Get statistics
    const stats = await this.getStats(userId);

    return {
      data: campaigns.map((c) => this.formatCampaignResponse(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  /**
   * Get sort column for query
   */
  private getSortColumn(sortBy: CampaignSortBy): string {
    switch (sortBy) {
      case CampaignSortBy.NAME:
        return 'campaign.name';
      case CampaignSortBy.RECIPIENTS:
        return 'campaign.recipients';
      case CampaignSortBy.STATUS:
        return 'campaign.status';
      case CampaignSortBy.CREATED_AT:
      default:
        return 'campaign.createdAt';
    }
  }

  /**
   * Format campaign response with list names
   */
  private formatCampaignResponse(campaign: Campaign): Campaign & { listName?: string } {
    const listName = campaign.lists?.map((l) => l.name).join(', ') || '';
    return {
      ...campaign,
      listName,
    };
  }

  /**
   * Get campaign statistics
   */
  async getStats(userId: string): Promise<CampaignStats> {
    const statusCounts = await this.campaignRepository
      .createQueryBuilder('campaign')
      .select('campaign.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('campaign.userId = :userId', { userId })
      .groupBy('campaign.status')
      .getRawMany();

    const stats: CampaignStats = {
      totalCampaigns: 0,
      drafts: 0,
      scheduled: 0,
      sent: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
    };

    statusCounts.forEach((row) => {
      const count = parseInt(row.count, 10);
      stats.totalCampaigns += count;
      if (row.status === 'draft') stats.drafts = count;
      else if (row.status === 'scheduled') stats.scheduled = count;
      else if (row.status === 'sent') stats.sent = count;
    });

    // Calculate average open/click rates from sent campaigns
    if (stats.sent > 0) {
      const rateResults = await this.campaignRepository
        .createQueryBuilder('campaign')
        .select('AVG(CASE WHEN campaign.delivered > 0 THEN (campaign.opened::float / campaign.delivered * 100) ELSE 0 END)', 'avgOpenRate')
        .addSelect('AVG(CASE WHEN campaign.delivered > 0 THEN (campaign.clicked::float / campaign.delivered * 100) ELSE 0 END)', 'avgClickRate')
        .where('campaign.userId = :userId', { userId })
        .andWhere('campaign.status = :status', { status: 'sent' })
        .andWhere('campaign.delivered > 0')
        .getRawOne();

      stats.avgOpenRate = parseFloat(rateResults?.avgOpenRate || '0');
      stats.avgClickRate = parseFloat(rateResults?.avgClickRate || '0');
    }

    return stats;
  }

  /**
   * Find a single campaign by ID
   */
  async findOne(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id, userId },
      relations: ['lists'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.formatCampaignResponse(campaign);
  }

  /**
   * Update a campaign
   */
  async update(userId: string, id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(userId, id);

    // Only allow updates for draft campaigns
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be updated');
    }

    // Update contact lists if provided
    if (dto.selectedListIds) {
      const lists = await this.listRepository.find({
        where: {
          id: In(dto.selectedListIds),
          userId,
        },
      });

      if (lists.length !== dto.selectedListIds.length) {
        throw new BadRequestException('One or more contact lists not found');
      }

      campaign.lists = lists;
      campaign.recipients = await this.countRecipientsFromLists(dto.selectedListIds);
    }

    // Update other fields
    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.description !== undefined) campaign.description = dto.description || null;
    if (dto.subject !== undefined) campaign.subject = dto.subject;
    if (dto.preheader !== undefined) campaign.preheader = dto.preheader || null;
    if (dto.senderName !== undefined) campaign.senderName = dto.senderName;
    if (dto.senderEmail !== undefined) campaign.senderEmail = dto.senderEmail;
    if (dto.replyTo !== undefined) campaign.replyTo = dto.replyTo || null;
    if (dto.sendType !== undefined) campaign.sendType = dto.sendType;
    if (dto.scheduledAt !== undefined) {
      campaign.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    if (dto.htmlContent !== undefined) campaign.htmlContent = dto.htmlContent || null;
    if (dto.templateId !== undefined) campaign.templateId = dto.templateId || null;

    return this.campaignRepository.save(campaign);
  }

  /**
   * Delete a campaign
   */
  async remove(userId: string, id: string): Promise<void> {
    const campaign = await this.findOne(userId, id);

    // Only allow deletion of draft campaigns
    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }

    await this.campaignRepository.delete({ id, userId });
  }

  /**
   * Duplicate a campaign
   */
  async duplicate(userId: string, id: string): Promise<Campaign> {
    const original = await this.findOne(userId, id);

    const duplicate = this.campaignRepository.create({
      userId,
      name: `${original.name} (Copy)`,
      description: original.description,
      subject: original.subject,
      preheader: original.preheader,
      senderName: original.senderName,
      senderEmail: original.senderEmail,
      replyTo: original.replyTo,
      sendType: 'now',
      scheduledAt: null,
      status: 'draft',
      htmlContent: original.htmlContent,
      templateId: original.templateId,
      recipients: original.recipients,
      lists: original.lists,
    });

    return this.campaignRepository.save(duplicate);
  }

  /**
   * Get contacts from selected lists
   */
  private async getContactsFromLists(listIds: string[]): Promise<Contact[]> {
    if (listIds.length === 0) return [];

    const members = await this.memberRepository.find({
      where: { listId: In(listIds) },
      relations: ['contact'],
    });

    // Get unique contacts
    const contactMap = new Map<string, Contact>();
    members.forEach((member) => {
      if (member.contact && !contactMap.has(member.contact.id)) {
        contactMap.set(member.contact.id, member.contact);
      }
    });

    return Array.from(contactMap.values());
  }

  /**
   * Send a campaign immediately using Resend
   */
  async send(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOne(userId, id);

    // Allow draft, scheduled, and failed campaigns to be sent
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled' && campaign.status !== 'failed') {
      throw new BadRequestException('Campaign cannot be sent in its current state');
    }

    if (!campaign.htmlContent) {
      throw new BadRequestException('Campaign has no email content');
    }

    if (campaign.recipients === 0) {
      throw new BadRequestException('Campaign has no recipients');
    }

    // Get contact list IDs
    const listIds = campaign.lists?.map((l) => l.id) || [];
    if (listIds.length === 0) {
      throw new BadRequestException('Campaign has no contact lists');
    }

    // Update status to sending
    campaign.status = 'sending';
    campaign.sentAt = new Date();
    await this.campaignRepository.save(campaign);

    try {
      // Get all contacts from selected lists
      const contacts = await this.getContactsFromLists(listIds);

      if (contacts.length === 0) {
        throw new BadRequestException('No contacts found in selected lists');
      }

      // Send via Resend
      const result = await this.emailService.sendCampaign({
        campaignId: campaign.id,
        senderName: campaign.senderName,
        senderEmail: campaign.senderEmail,
        replyTo: campaign.replyTo,
        subject: campaign.subject,
        htmlContent: campaign.htmlContent,
        contacts,
      });

      // Update campaign with results
      campaign.status = 'sent';
      campaign.delivered = result.sent;

      return this.campaignRepository.save(campaign);
    } catch (error) {
      // Mark as failed
      campaign.status = 'failed';
      await this.campaignRepository.save(campaign);
      
      // Wrap the error in BadRequestException so frontend gets proper error message
      throw new BadRequestException(error.message || 'Failed to send campaign');
    }
  }

  /**
   * Schedule a campaign for later sending
   */
  async schedule(userId: string, id: string, dto: ScheduleCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(userId, id);

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be scheduled');
    }

    if (!campaign.htmlContent) {
      throw new BadRequestException('Campaign has no email content');
    }

    if (campaign.recipients === 0) {
      throw new BadRequestException('Campaign has no recipients');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    campaign.status = 'scheduled';
    campaign.sendType = 'scheduled';
    campaign.scheduledAt = scheduledAt;

    return this.campaignRepository.save(campaign);
  }

  /**
   * Pause a sending campaign
   */
  async pause(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOne(userId, id);

    if (campaign.status !== 'sending' && campaign.status !== 'scheduled') {
      throw new BadRequestException('Only sending or scheduled campaigns can be paused');
    }

    campaign.status = 'paused';
    return this.campaignRepository.save(campaign);
  }

  /**
   * Resume a paused campaign
   */
  async resume(userId: string, id: string): Promise<Campaign> {
    const campaign = await this.findOne(userId, id);

    if (campaign.status !== 'paused') {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    // Resume to scheduled if it had a schedule, otherwise start sending
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      campaign.status = 'scheduled';
    } else {
      campaign.status = 'sending';
    }

    return this.campaignRepository.save(campaign);
  }

  /**
   * Get campaign analytics
   */
  async getAnalytics(userId: string, id: string): Promise<CampaignAnalytics> {
    const campaign = await this.findOne(userId, id);

    const delivered = campaign.delivered || 0;
    const overview = {
      recipients: campaign.recipients,
      delivered,
      deliveryRate: campaign.recipients > 0 ? (delivered / campaign.recipients) * 100 : 0,
      opened: campaign.opened,
      openRate: delivered > 0 ? (campaign.opened / delivered) * 100 : 0,
      clicked: campaign.clicked,
      clickRate: delivered > 0 ? (campaign.clicked / delivered) * 100 : 0,
      bounced: campaign.bounced,
      bounceRate: campaign.recipients > 0 ? (campaign.bounced / campaign.recipients) * 100 : 0,
      complained: campaign.complained,
      complaintRate: delivered > 0 ? (campaign.complained / delivered) * 100 : 0,
    };

    // Get timeline from events
    const timeline = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'event')
      .addSelect('event.createdAt', 'timestamp')
      .addSelect('COUNT(*)', 'count')
      .where('event.campaignId = :campaignId', { campaignId: id })
      .groupBy('event.eventType, event.createdAt')
      .orderBy('event.createdAt', 'ASC')
      .getRawMany();

    return {
      campaignId: id,
      overview,
      timeline: timeline.map((t) => ({
        timestamp: t.timestamp,
        event: t.event,
        count: parseInt(t.count, 10),
      })),
    };
  }

  /**
   * Send a test email using Resend
   */
  async sendTestEmail(userId: string, id: string, dto: SendTestDto): Promise<{ message: string; recipientEmail: string }> {
    const campaign = await this.findOne(userId, id);

    if (!campaign.htmlContent) {
      throw new BadRequestException('Campaign has no email content');
    }

    try {
      await this.emailService.sendTestEmail({
        recipientEmail: dto.recipientEmail,
        senderName: campaign.senderName,
        senderEmail: campaign.senderEmail,
        replyTo: campaign.replyTo,
        subject: campaign.subject,
        htmlContent: campaign.htmlContent,
        campaignId: campaign.id,
      });

      return {
        message: 'Test email sent successfully',
        recipientEmail: dto.recipientEmail,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send test email: ${error.message}`);
    }
  }
}
