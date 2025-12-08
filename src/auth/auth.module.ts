import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase/supabase.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ProfileModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseService, JwtStrategy],
  exports: [SupabaseService, AuthService],
})
export class AuthModule {}
