import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Profile entity stores user profile data in PostgreSQL.
 * The ID is the Supabase Auth user ID (UUID) - not auto-generated.
 */
@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid')
  id: string; // Links to Supabase Auth user.id

  @Column({ unique: true })
  email: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  company: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  // Notification Preferences (all default to false)
  @Column({ name: 'notify_campaign_reports', default: false })
  notifyCampaignReports: boolean;

  @Column({ name: 'notify_weekly_digest', default: false })
  notifyWeeklyDigest: boolean;

  @Column({ name: 'notify_product_updates', default: false })
  notifyProductUpdates: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
