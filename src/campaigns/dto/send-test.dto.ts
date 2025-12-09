import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for sending a test email
 */
export class SendTestDto {
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid recipient email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  recipientEmail: string;
}
