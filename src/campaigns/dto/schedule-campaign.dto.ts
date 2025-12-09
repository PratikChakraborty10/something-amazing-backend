import { IsDateString, IsNotEmpty } from 'class-validator';

/**
 * DTO for scheduling a campaign
 */
export class ScheduleCampaignDto {
  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;
}
