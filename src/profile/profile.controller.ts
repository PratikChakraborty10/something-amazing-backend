import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard) // All profile routes require authentication
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /api/profile
   * Get the current user's profile
   */
  @Get()
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.profileService.getProfile(user.id);
  }

  /**
   * PATCH /api/profile
   * Update the current user's profile
   */
  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, updateDto);
  }
}
