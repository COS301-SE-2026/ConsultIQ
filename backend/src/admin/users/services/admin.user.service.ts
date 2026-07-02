import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) { }

  async deleteUser(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          status: 'ARCHIVED',
        },
      });

      return { message: 'User deleted successfully' };
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

  async getAllUsers(page: number = 1, limit: number = 10) {
    const [consultants, filteredTotal, total, activeUsers, suspendedUsers] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { deletedAt: null, status: { not: 'ARCHIVED' } },
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

      this.prisma.user.count({
        where: { deletedAt: null, status: { not: 'ARCHIVED' } },
      }),

      this.prisma.user.count(),

      this.prisma.user.count({
        where: { deletedAt: null, status: 'ACTIVE' },
      }),

      this.prisma.user.count({
        where: { deletedAt: null, status: 'SUSPENDED' },
      }),
    ]);

    return {
      data: consultants,
      meta: {
        totalRecords: filteredTotal,
        absoluteTotalRecords: total,
        activeUsers: activeUsers,
        suspendedUsers: suspendedUsers,
        currentPage: page,
        totalPages: Math.ceil(filteredTotal / limit),
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
