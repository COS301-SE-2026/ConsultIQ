import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { fieldEncryptionExtension } from 'prisma-field-encryption';

function buildEncryptedClient() {
  return new PrismaClient({
    log: ['info', 'warn', 'error'],
  }).$extends(fieldEncryptionExtension());
}

@Injectable()
export class PrismaService
  extends (buildEncryptedClient as unknown as new () => PrismaClient)
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    //prismaClient logging info
    super();
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(PrismaService.prototype));
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
