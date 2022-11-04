import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import User from '../users/user.entity';

@Injectable()
export default class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // This is necessary for JwtStrategy.validate to be called
    await super.canActivate(context);
    // Allow the request to be processed even if the user isn't logged in
    return true;
  }

  handleRequest(
    err: Error | null,
    user: User | false,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): any {
    if (err) {
      throw err;
    }
    // Normally an exception is thrown if `user` is falsy; we override
    // the handleRequest method to make sure that doesn't happen.
    // See https://github.com/nestjs/passport/blob/master/lib/auth.guard.ts.
    //
    // Somewhere along the PassportJS callback hell, the null value which we
    // return from the JwtStrategy gets discarded and replaced with `false`.
    // Null is more semantically appropriate here, so we explicitly return
    // that instead.
    return user || null;
  }
}
