import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest, SignIn } from './auth.guard';

/** AuthGuard가 붙인 로그인 정보를 꺼낸다. */
export const CurrentSignIn = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignIn | null =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().signIn
);
