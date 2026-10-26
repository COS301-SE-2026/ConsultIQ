import { 
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisUtilityService } from '../../../common/services/redis-utility.service';

@Injectable()
export class AdminProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisUtilityService: RedisUtilityService,
  ) {}

  async archiveProject(projectId: string, adminUserId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });

    if(!project) {
      throw new NotFoundException('Project does not exist');
    }

    if(project.status === 'COMPLETED') {
      throw new BadRequestException ('Completed project cannot be archived');
    }

    return this.setProjectArchivedState(
      projectId,
      adminUserId,
      'ARCHIVED',
      'ARCHIVE',
      new Date(),
      'Project archived successfully',
    );
  }

  async unarchiveProject(projectId: string, adminUserId: string) {
    return this.setProjectArchivedState(
      projectId,
      adminUserId,
      'OPEN',
      'UNARCHIVE',
      null,
      'Project unarchived successfully',
    );
  }

  private async setProjectArchivedState(
    projectId: string,
    adminUserId: string,
    status: 'ARCHIVED' | 'OPEN',
    action: 'ARCHIVE' | 'UNARCHIVE',
    archivedAt: Date | null,
    message: string,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: projectId },
          data: { archivedAt, status },
        });

        await tx.projectAuditLog.create({
          data: {
            projectId,
            action,
            userId: adminUserId,
            createdAt: new Date(),
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Object &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Project does not exist');
      }
      throw error;
    }

    await this.redisUtilityService.invalidateCacheByPattern('cache:projects:*');
    return { message };
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
