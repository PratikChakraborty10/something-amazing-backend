import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Contact status filter options
 */
export enum ContactStatusFilter {
  ALL = 'all',
  VALID = 'valid',
  INVALID = 'invalid',
  DUPLICATE = 'duplicate',
}

/**
 * Sort field options
 */
export enum ContactSortBy {
  EMAIL = 'email',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

/**
 * Sort order options
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying contacts with pagination, search, and filters
 */
export class QueryContactsDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContactStatusFilter)
  status?: ContactStatusFilter = ContactStatusFilter.ALL;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsEnum(ContactSortBy)
  sortBy?: ContactSortBy = ContactSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
