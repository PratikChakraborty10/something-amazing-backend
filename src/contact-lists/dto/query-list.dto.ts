import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for querying contact lists
 */
export class QueryListsDto {
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO for querying a single contact list with optional contacts
 */
export class QueryListDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeContacts?: boolean = true;

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
}
