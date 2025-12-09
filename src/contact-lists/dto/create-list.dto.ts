import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a contact list
 */
export class CreateListDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactIds?: string[];
}
