import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Campaign status filter enum
 */
export enum CampaignStatusFilter {
  ALL = 'all',
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  FAILED = 'failed',
}

/**
 * Campaign sort by options
 */
export enum CampaignSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  RECIPIENTS = 'recipients',
  STATUS = 'status',
}

/**
 * Sort order enum
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying campaigns with pagination and filters
 */
export class QueryCampaignsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CampaignStatusFilter)
  status?: CampaignStatusFilter;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(CampaignSortBy)
  sortBy?: CampaignSortBy = CampaignSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
