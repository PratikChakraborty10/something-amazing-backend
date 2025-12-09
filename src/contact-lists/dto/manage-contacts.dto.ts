import { IsArray, IsString } from 'class-validator';

/**
 * DTO for adding or removing contacts from a list
 */
export class ManageContactsDto {
  @IsArray()
  @IsString({ each: true })
  contactIds: string[];
}
