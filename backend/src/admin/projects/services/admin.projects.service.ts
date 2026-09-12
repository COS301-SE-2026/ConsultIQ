import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async archiveProject(projectId: string, adminUserId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: projectId },
          data: {
            archivedAt: new Date(),
            status: 'ARCHIVED',
          },
        });

        await tx.projectAuditLog.create({
          data: {
            projectId: projectId,
            action: 'ARCHIVE',
            userId: adminUserId,
            createdAt: new Date(),
          },
        });
      });
      return { message: 'Project archived successfully' };
    } catch (error) {
      if (
        error instanceof Object &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Project does not exist');
      } else {
        throw error;
      }
    }
  }

  async unarchiveProject(projectId: string, adminUserId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: projectId },
          data: {
            archivedAt: null,
            status: 'OPEN',
          },
        });

        await tx.projectAuditLog.create({
          data: {
            projectId: projectId,
            action: 'UNARCHIVE',
            userId: adminUserId,
            createdAt: new Date(),
          },
        });
      });

      return { message: 'Project unarchived successfully' };
    } catch (error) {
      if (
        error instanceof Object &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Project does not exist');
      } else {
        throw error;
      }
    }
  }

  async getAllProjects(page: number = 1, limit: number = 10, search?: string, budgetSort?: 'asc' | 'desc') {
    const where: any = {};

    if(search) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive'} },
        { clientName: { contains: search, mode: 'insensitive'} },
      ];
    }

    const [projects, total, absoluteTotal] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: budgetSort ? { budget: budgetSort } : undefined,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          projectName: true,
          status: true,
          clientName: true,
          createdAt: true,
          budget: true,
        },
      }),

      this.prisma.project.count({ where }),
      this.prisma.project.count(),
    ]);

    return {
      data: projects,
      meta: {
        totalRecords: total,
        absoluteTotalRecords: absoluteTotal,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
