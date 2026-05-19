import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    }>();
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return req.socket?.remoteAddress ?? 'unknown';
  },
);
