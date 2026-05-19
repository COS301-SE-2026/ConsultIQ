export class PrismaClient {
  user = { findUnique: jest.fn(), create: jest.fn() };
  consultant = { create: jest.fn() };
  skill = { upsert: jest.fn() };
  consultantSkill = { create: jest.fn() };
  certificate = { create: jest.fn() };
  $connect = jest.fn();
  $transaction = jest.fn();
}

export class PrismaService extends PrismaClient {
  async onModuleInit() {
    await this.$connect();
  }
}

export const Role = {
  CONSULTANT: 'CONSULTANT',
  ADMIN: 'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  CONSULTANT_MANAGER: 'CONSULTANT_MANAGER',
};

export const ConsultantAvailability = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  ON_LEAVE: 'ON_LEAVE',
};

export const CompetencyLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  EXPERT: 'EXPERT',
};