import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';

/**
 * Verification status enum matching AWS SES states
 */
export type VerificationStatus = 
  | 'Pending'
  | 'Success'
  | 'Failed'
  | 'TemporaryFailure'
  | 'NotStarted';

/**
 * Domain entity stores verified/pending domains for email sending
 */
@Entity('domains')
@Index(['userId', 'domain'], { unique: true })
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column()
  domain: string;

  @Column('text', { name: 'verification_token', nullable: true })
  verificationToken: string | null;

  @Column('text', { array: true, name: 'dkim_tokens', nullable: true })
  dkimTokens: string[] | null;

  @Column({
    name: 'verification_status',
    default: 'Pending',
  })
  verificationStatus: VerificationStatus;

  @Column({
    name: 'dkim_verification_status',
    default: 'Pending',
  })
  dkimVerificationStatus: VerificationStatus;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column('timestamp', { name: 'last_checked_at', nullable: true })
  lastCheckedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
