import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto } from './dto';

/**
 * Interface for creating a new profile (on signup)
 */
interface CreateProfileData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  /**
   * Create a new profile (called during signup)
   */
  async createProfile(data: CreateProfileData): Promise<Profile> {
    const profile = this.profileRepository.create({
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      // All notification preferences default to false via entity definition
    });

    return this.profileRepository.save(profile);
  }

  /**
   * Find profile by Supabase user ID
   */
  async findByUserId(userId: string): Promise<Profile | null> {
    return this.profileRepository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Get profile or throw 404
   */
  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  /**
   * Update profile (partial update)
   */
  async updateProfile(
    userId: string,
    updateDto: UpdateProfileDto,
  ): Promise<Profile> {
    const profile = await this.getProfile(userId);

    // Merge updates into existing profile
    Object.assign(profile, updateDto);

    return this.profileRepository.save(profile);
  }

  /**
   * Delete profile (for account deletion)
   */
  async deleteProfile(userId: string): Promise<void> {
    const result = await this.profileRepository.delete({ id: userId });

    if (result.affected === 0) {
      throw new NotFoundException('Profile not found');
    }
  }
}
