import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';
import { ProfileService } from '../profile/profile.service';
import { SignupDto, SigninDto } from './dto';

/**
 * AuthService handles authentication operations via Supabase Auth.
 * All token management is handled by Supabase - we don't issue our own tokens.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Register a new user via Supabase Auth and create their profile
   */
  async signUp(signupDto: SignupDto) {
    const { email, password, firstName, lastName } = signupDto;

    // Create user in Supabase Auth
    const { data, error } = await this.supabaseService.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException(error.message);
    }

    if (!data.user) {
      throw new InternalServerErrorException('Failed to create user');
    }

    // Create profile in our database
    try {
      await this.profileService.createProfile({
        id: data.user.id,
        email: data.user.email!,
        firstName,
        lastName,
      });
    } catch (error) {
      // Handle unique constraint violation (orphaned profile)
      if (error.code === '23505') { // Postgres unique_violation
        throw new ConflictException('An account with this email already exists. Please log in.');
      }
      throw error;
    }

    return {
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName,
        lastName,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in,
            expiresAt: data.session.expires_at,
          }
        : null,
    };
  }

  /**
   * Sign in user via Supabase Auth
   */
  async signIn(signinDto: SigninDto) {
    const { email, password } = signinDto;

    const { data, error } =
      await this.supabaseService.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException('Authentication failed');
    }

    // Fetch the profile to include in response
    const profile = await this.profileService.findByUserId(data.user.id);

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
      },
    };
  }

  /**
   * Get the current authenticated user's profile
   */
  async getCurrentUser(userId: string) {
    const profile = await this.profileService.findByUserId(userId);

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    return profile;
  }
}
