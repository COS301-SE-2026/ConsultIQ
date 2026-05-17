import { PrismaService } from './prisma.service';
import { PrismaClient } from '@prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    jest
      .spyOn(PrismaClient.prototype, '$connect')
      .mockResolvedValue(undefined);
    jest
      .spyOn(PrismaClient.prototype, '$disconnect')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should connect to the database on module init', async () => {
    await service.onModuleInit();
    expect(PrismaClient.prototype.$connect).toHaveBeenCalled();
  });

  it('should disconnect from the database on module destroy', async () => {
    await service.onModuleDestroy();
    expect(PrismaClient.prototype.$disconnect).toHaveBeenCalled();
  });
});