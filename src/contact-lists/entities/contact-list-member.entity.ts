import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContactList } from './contact-list.entity';
import { Contact } from '../../contacts/entities/contact.entity';

/**
 * Junction table for contact list membership.
 * Links contacts to lists with unique constraint.
 */
@Entity('contact_list_members')
@Index(['listId'])
@Index(['contactId'])
@Index(['listId', 'contactId'], { unique: true })
export class ContactListMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'list_id', type: 'uuid' })
  listId: string;

  @Column({ name: 'contact_id', type: 'uuid' })
  contactId: string;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;

  @ManyToOne(() => ContactList, (list) => list.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list: ContactList;

  @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;
}
