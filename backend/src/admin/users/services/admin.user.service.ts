import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  // async deleteUser(userId: string) {
  //   try {
  //     await this.prisma.user.update({
  //       where: { id: userId },
  //       data: {
  //         deletedAt: new Date(),
  //         status: 'ARCHIVED',
  //       },
  //     });

  //     return { message: 'User deleted successfully' };
  //   } catch (error) {
  //     if (
  //       error instanceof Object &&
  //       'code' in error &&
  //       error.code === 'P2025'
  //     ) {
  //       throw new NotFoundException('User does not exist');
  //     } else {
  //       throw error;
  //     }
  //   }
  // }

  async getAllUsers(page: number = 1, limit: number = 10) {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const baseWhere = {
      deletedAt: null,
      role: { not: 'ADMIN' as const },
    };

    const listWhere = {
      ...baseWhere,
      status: {
        not: 'PENDING' as const,
      },
    };

    const [users, totalUsers, activeUsers, suspendedUsers] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where: listWhere,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        }),

        this.prisma.user.count({ where: baseWhere }),

        this.prisma.user.count({
          where: {
            ...baseWhere,
            status: 'ACTIVE',
          },
        }),

        this.prisma.user.count({
          where: {
            ...baseWhere,
            status: 'SUSPENDED',
          },
        }),
      ]);

    return {
      data: users,
      meta: {
        totalRecords: totalUsers,
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        activeUsers,
        suspendedUsers,
      },
    };
  }

  async activateUser(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });

      return { message: 'User activated successfully' };
    } catch (error) {
      if (
        error instanceof Object &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User does not exist');
      } else {
        throw error;
      }
    }
  }

  async suspendUser(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });

      return { message: 'User suspended successfully' };
    } catch (error) {
      if (
        error instanceof Object &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User does not exist');
      } else {
        throw error;
      }
    }
  }
}
