import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { ContactList } from '../../contact-lists/entities/contact-list.entity';
import { CampaignEvent } from './campaign-event.entity';

/**
 * Campaign status enum
 */
export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'failed';

/**
 * Campaign send type
 */
export type CampaignSendType = 'now' | 'scheduled';

/**
 * Campaign entity for email marketing campaigns.
 * Each campaign belongs to a user and can target multiple contact lists.
 */
@Entity('campaigns')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['scheduledAt'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  preheader: string | null;

  @Column({ name: 'sender_name', type: 'varchar', length: 255 })
  senderName: string;

  @Column({ name: 'sender_email', type: 'varchar', length: 320 })
  senderEmail: string;

  @Column({ name: 'reply_to', type: 'varchar', length: 320, nullable: true })
  replyTo: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: CampaignStatus;

  @Column({
    name: 'send_type',
    type: 'varchar',
    length: 20,
    default: 'now',
  })
  sendType: CampaignSendType;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'html_content', type: 'text', nullable: true })
  htmlContent: string | null;

  @Column({ name: 'template_id', type: 'varchar', length: 100, nullable: true })
  templateId: string | null;

  // Metrics (denormalized for fast reads)
  @Column({ type: 'integer', default: 0 })
  recipients: number;

  @Column({ type: 'integer', default: 0 })
  delivered: number;

  @Column({ type: 'integer', default: 0 })
  opened: number;

  @Column({ type: 'integer', default: 0 })
  clicked: number;

  @Column({ type: 'integer', default: 0 })
  bounced: number;

  @Column({ type: 'integer', default: 0 })
  complained: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relationships
  @ManyToMany(() => ContactList)
  @JoinTable({
    name: 'campaign_lists',
    joinColumn: { name: 'campaign_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'list_id', referencedColumnName: 'id' },
  })
  lists: ContactList[];

  @OneToMany(() => CampaignEvent, (event) => event.campaign)
  events: CampaignEvent[];
}
