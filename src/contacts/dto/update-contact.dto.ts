import { PartialType } from '@nestjs/mapped-types';
import { CreateContactDto } from './create-contact.dto';

/**
 * DTO for updating a contact (all fields optional)
 */
export class UpdateContactDto extends PartialType(CreateContactDto) {}
