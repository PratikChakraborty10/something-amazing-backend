import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  IsUUID,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Send type enum for campaign
 */
export enum SendType {
  NOW = 'now',
  SCHEDULED = 'scheduled',
}

/**
 * DTO for creating a new campaign
 */
export class CreateCampaignDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(255)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  preheader?: string;

  @IsString()
  @MaxLength(255)
  senderName: string;

  @IsEmail({}, { message: 'Invalid sender email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(320)
  senderEmail: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid reply-to email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(320)
  replyTo?: string;

  @IsOptional()
  @IsEnum(SendType)
  sendType?: SendType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedListIds?: string[];
}
