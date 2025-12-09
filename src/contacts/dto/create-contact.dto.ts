import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for creating a single contact
 */
export class CreateContactDto {
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

  @IsOptional()
  @IsObject()
  customMeta?: Record<string, string>;
}
