import { createParamDecorator, ExecutionContext } from '@nestjs/common';


export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.headers['user-agent'];
  },
);
