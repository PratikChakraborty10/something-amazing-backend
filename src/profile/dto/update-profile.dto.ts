import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  @IsOptional()
  avatarUrl?: string;

  // Notification preferences
  @IsBoolean()
  @IsOptional()
  notifyCampaignReports?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyWeeklyDigest?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyProductUpdates?: boolean;
}
