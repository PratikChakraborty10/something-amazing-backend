import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from './entities/campaign.entity';
import { CampaignEvent } from './entities/campaign-event.entity';
import { ContactList } from '../contact-lists/entities/contact-list.entity';
import { ContactListMember } from '../contact-lists/entities/contact-list-member.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { SesService } from '../common/email/ses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      CampaignEvent,
      ContactList,
      ContactListMember,
      Contact,
    ]),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, SesService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
