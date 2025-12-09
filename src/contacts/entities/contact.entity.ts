import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';

/**
 * Contact entity for storing email recipients.
 * Each contact belongs to a user (user_id) and has a unique email per user.
 */
@Entity('contacts')
@Index(['userId', 'email'], { unique: true })
@Index(['userId'])
@Index(['email'])
@Index(['status'])
@Index(['createdAt'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  company: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  role: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ name: 'custom_meta', type: 'jsonb', default: '{}' })
  customMeta: Record<string, string>;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'valid',
  })
  status: 'valid' | 'invalid' | 'duplicate';

  @Column({ name: 'validation_errors', type: 'text', array: true, default: '{}' })
  validationErrors: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

