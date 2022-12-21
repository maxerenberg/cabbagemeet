import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import User from '../users/user.entity';

// Should be used with JwtAuthGuard
export const AuthUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User => {
    const req = context.switchToHttp().getRequest<Request>();
    return req.user as User;
  },
);

// Should be used with MaybeJwtAuthGuard
export const MaybeAuthUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User | null => {
    const req = context.switchToHttp().getRequest<Request>();
    return req.user as User | null;
  },
);
