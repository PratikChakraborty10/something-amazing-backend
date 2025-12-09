import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * EmailTemplate entity for pre-built email templates.
 * Uses string IDs for human-readable identifiers (e.g., 'welcome-email').
 */
@Entity('email_templates')
@Index(['category'])
export class EmailTemplate {
  @PrimaryColumn('varchar', { length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
