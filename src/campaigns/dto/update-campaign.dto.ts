import { PartialType } from '@nestjs/mapped-types';
import { CreateCampaignDto } from './create-campaign.dto';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating a campaign (partial update)
 */
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}
