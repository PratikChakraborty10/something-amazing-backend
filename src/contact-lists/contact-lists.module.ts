import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactListsController } from './contact-lists.controller';
import { ContactListsService } from './contact-lists.service';
import { ContactList } from './entities/contact-list.entity';
import { ContactListMember } from './entities/contact-list-member.entity';
import { Contact } from '../contacts/entities/contact.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactList, ContactListMember, Contact]),
  ],
  controllers: [ContactListsController],
  providers: [ContactListsService],
  exports: [ContactListsService],
})
export class ContactListsModule {}
