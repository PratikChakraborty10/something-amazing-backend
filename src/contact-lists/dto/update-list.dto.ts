import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateListDto } from './create-list.dto';

/**
 * DTO for updating a contact list (excludes contactIds)
 */
export class UpdateListDto extends PartialType(
  OmitType(CreateListDto, ['contactIds'] as const),
) {}
