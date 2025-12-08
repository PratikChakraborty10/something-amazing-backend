import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Payload structure from Supabase JWT tokens
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  aud: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * JwtStrategy validates Supabase-issued JWTs.
 * The JWT secret is obtained from Supabase dashboard.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET must be defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Called after token is verified. The return value is attached to request.user
   */
  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Return user info that will be available in request.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
