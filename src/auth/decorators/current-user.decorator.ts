import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * User object attached to request by JwtStrategy
 */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Parameter decorator to extract the current user from the request.
 * Usage: @CurrentUser() user: AuthUser
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
