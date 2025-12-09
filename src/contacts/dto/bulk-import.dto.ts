import {
  IsArray,
  IsEnum,
  ValidateNested,
  IsEmail,
  IsString,
  IsOptional,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Single contact item in bulk import
 */
export class BulkContactItemDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(320)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Deduplication strategies for handling duplicate emails
 */
export enum DedupeStrategy {
  KEEP_FIRST = 'keepFirst',
  KEEP_LAST = 'keepLast',
  MERGE = 'merge',
}

/**
 * DTO for bulk importing contacts
 */
export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkContactItemDto)
  @ArrayMaxSize(10000, { message: 'Maximum 10,000 contacts per request' })
  contacts: BulkContactItemDto[];

  @IsEnum(DedupeStrategy)
  dedupeStrategy: DedupeStrategy;
}

/**
 * DTO for bulk delete operation
 */
export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
