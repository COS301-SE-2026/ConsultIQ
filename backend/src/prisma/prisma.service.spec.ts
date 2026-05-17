import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    // Mock the connect and disconnect methods
    (service as any).$connect = jest.fn().mockResolvedValue(undefined);
    (service as any).$disconnect = jest.fn().mockResolvedValue(undefined);
  });

  it('should connect to the database on module init', async () => {
    await service.onModuleInit();
    expect((service as any).$connect).toHaveBeenCalled();
  });

  it('should disconnect from the database on module destroy', async () => {
    await service.onModuleDestroy();
    expect((service as any).$disconnect).toHaveBeenCalled();
  });
});