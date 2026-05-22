import { ExecutionContext } from '@nestjs/common';
import { ClientIp } from '../../../common/decorators/client-ip.decorator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

// A dummy controller class and method 
//class itself is never instantiated.
class MockController {

  route(@ClientIp() _ip: string) {
    /* placeholder */
  }
}

function getFactory(): (data: unknown, ctx: ExecutionContext) => string {
  const meta = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    MockController,
    'route',
  ) as unknown as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => string }
  >;

  // meta is keyed by `${ParamType}:${index}` — grab the first (and only) entry
  const [entry] = Object.values(meta);
  return entry.factory;
}

function makeContext(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string,
): ExecutionContext {
  const request = {
    headers,
    socket: remoteAddress !== undefined ? { remoteAddress } : {},
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('@ClientIp() decorator', () => {
  let factory: (data: unknown, ctx: ExecutionContext) => string;

  beforeAll(() => {
    factory = getFactory();
  });

  // -------------------------------------------------------------------------
  // x-forwarded-for present
  // -------------------------------------------------------------------------

  describe('when x-forwarded-for header is present', () => {
    it('returns the first IP from a comma-separated list', () => {
      const ctx = makeContext(
        { 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 172.16.0.3' },
        '127.0.0.1',
      );

      expect(factory(undefined, ctx)).toBe('203.0.113.5');
    });

    it('trims whitespace from the extracted IP', () => {
      const ctx = makeContext(
        { 'x-forwarded-for': '  198.51.100.42  , 10.0.0.2' },
        '127.0.0.1',
      );

      expect(factory(undefined, ctx)).toBe('198.51.100.42');
    });

    it('returns the sole IP when only one is listed', () => {
      const ctx = makeContext(
        { 'x-forwarded-for': '203.0.113.9' },
        '127.0.0.1',
      );

      expect(factory(undefined, ctx)).toBe('203.0.113.9');
    });

    it('prefers x-forwarded-for over socket.remoteAddress', () => {
      const ctx = makeContext(
        { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
        '127.0.0.1',
      );

      // Must NOT return the socket address
      expect(factory(undefined, ctx)).not.toBe('127.0.0.1');
    });

    it('ignores an array-typed x-forwarded-for (non-string) and falls back to socket', () => {

      const ctx = makeContext(
        { 'x-forwarded-for': ['203.0.113.5', '10.0.0.1'] },
        '127.0.0.1',
      );

      expect(factory(undefined, ctx)).toBe('127.0.0.1');
    });
  });

  // -------------------------------------------------------------------------
  // x-forwarded-for absent — fall back to socket.remoteAddress
  // -------------------------------------------------------------------------

  describe('when x-forwarded-for header is absent', () => {
    it('returns socket.remoteAddress', () => {
      const ctx = makeContext({}, '127.0.0.1');

      expect(factory(undefined, ctx)).toBe('127.0.0.1');
    });

    it('returns socket.remoteAddress when header is explicitly undefined', () => {
      const ctx = makeContext({ 'x-forwarded-for': undefined }, '192.168.1.10');

      expect(factory(undefined, ctx)).toBe('192.168.1.10');
    });
  });

  // -------------------------------------------------------------------------
  // Both header and socket are absent
  // -------------------------------------------------------------------------

  describe('when both x-forwarded-for and socket.remoteAddress are absent', () => {
    it('returns "unknown"', () => {
      const ctx = makeContext({});

      expect(factory(undefined, ctx)).toBe('unknown');
    });
  });
});
