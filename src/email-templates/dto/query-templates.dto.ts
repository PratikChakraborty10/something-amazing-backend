import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for querying email templates
 */
export class QueryTemplatesDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;
}
