import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Contact } from '../../contacts/entities/contact.entity';

/**
 * Event types for campaign tracking
 */
export type CampaignEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed';

/**
 * CampaignEvent entity for tracking email delivery events.
 * Used for detailed analytics and debugging.
 */
@Entity('campaign_events')
@Index(['campaignId'])
@Index(['contactId'])
@Index(['eventType'])
@Index(['createdAt'])
export class CampaignEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @ManyToOne(() => Contact, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: CampaignEventType;

  @Column({ name: 'event_data', type: 'jsonb', default: '{}' })
  eventData: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
