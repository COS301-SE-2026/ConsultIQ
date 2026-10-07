import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlacementDto } from '../dto/create-placement.dto';
import { PlacementStatus, AuditAction, Prisma } from '@prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { NotificationService } from '../../notification/service/notification.service';

@Injectable()
export class PlacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly notification: NotificationService,
  ) { }

  async createPlacement(
    projectId: string,
    dto: CreatePlacementDto,
    userId: string,
  ) {
    // ---- PM Ownership check ----
    const isAssignedManager = await this.isProjectManagerForProject(
      userId,
      projectId,
    );
    if (!isAssignedManager) {
      throw new ForbiddenException(
        'Only the assigned Project Manager can create placements for this project.',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found.`);
    }

    const consultant = await this.prisma.consultant.findUnique({
      where: { id: dto.consultantId },
      select: {
        id: true,
        capacity: true,
        availability: true,
        userId: true,
        costToCompany: true,
      },
    });
    if (!consultant) {
      throw new NotFoundException(
        `Consultant with ID ${dto.consultantId} not found.`,
      );
    }

    // -------- No-duplicate ------------
    const existingPlacement = await this.prisma.projectPlacement.findFirst({
      where: {
        projectId,
        consultantId: dto.consultantId,
        status: PlacementStatus.ACTIVE,
      },
    });
    if (existingPlacement) {
      throw new ConflictException(
        'This consultant is already placed on this project.',
      );
    }

    // -------- Team Size Check --------
    const activePlacements = await this.prisma.projectPlacement.count({
      where: {
        projectId,
        status: PlacementStatus.ACTIVE,
      },
    });

    if (activePlacements >= project.teamSize) {
      throw new ConflictException(
        `Cannot place consultant: project team size limit of ${project.teamSize} has been reached.`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date.');
    }

    // -------- Capacity check --------
    const remainingCapacity = consultant.capacity;

    if (dto.allocation > remainingCapacity) {
      throw new BadRequestException(
        `Cannot place consultant: only ${remainingCapacity}% capacity remaining for this period, but ${dto.allocation}% was requested.`,
      );
    }

    // -------- Budget Feasibility Check --------
    const budgetEndDate = endDate ?? project.endDate;
    if (!budgetEndDate) {
      throw new BadRequestException(
        'A project or placement end date is required to calculate budget feasibility.',
      );
    }


    const placement = await this.prisma.$transaction(async (tx) => {
      await this.validateBudgetFeasibility(
        tx,
        projectId,
        consultant.costToCompany,
        dto.allocation,
        startDate,
        budgetEndDate,
        project.budget,
      );

      const updatedConsultant = await tx.consultant.update({
        where: { id: dto.consultantId },
        data: {
          capacity: { decrement: dto.allocation },
        },
      });

      const placement = await tx.projectPlacement.create({
        data: {
          projectId,
          consultantId: dto.consultantId,
          startDate,
          endDate,
          allocation: dto.allocation,
          status: PlacementStatus.ACTIVE,
        },
      });

      const nextAvailability =
        updatedConsultant.capacity <= 0 ? 'UNAVAILABLE' : 'AVAILABLE';
      if (updatedConsultant.availability !== nextAvailability) {
        await tx.consultant.update({
          where: { id: dto.consultantId },
          data: { availability: nextAvailability },
        });
      }

      return placement;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.auditLog.log({
      action: AuditAction.PLACEMENT_CREATED,
      actingUserId: userId,
      entityType: 'Placement',
      entityId: placement.id,
      metadata: {
        projectId,
        consultantId: dto.consultantId,
        allocation: dto.allocation,
      },
    });

    let stringDate = 'starting on ' + startDate.toDateString();
    if (startDate < new Date()) {
      stringDate = 'which started on ' + startDate.toDateString();
    }

    await this.notification.createAndSendNotification(
      consultant.userId,
      'New Placement Assigned',
      `You have been assigned to project ${project.projectName} ${stringDate}.`,
    );

    return {
      message: 'Placement created successfully.',
      placementId: placement.id,
    };
  }

  /**
   * Computes whether the project has sufficient lifetime budget for this placement.
   */
  private async validateBudgetFeasibility(
    prisma: Prisma.TransactionClient,
    projectId: string,
    costToCompany: number,
    allocation: number,
    startDate: Date,
    endDate: Date,
    projectBudget: number,
  ): Promise<void> {
    if (costToCompany === undefined || costToCompany === null) {
      throw new BadRequestException(
        'Consultant Cost To Company is required for budget calculation.',
      );
    }

    const newPlacementDays = this.calculateDaysBetween(startDate, endDate);
    const newPlacementCost = newPlacementDays * costToCompany * (allocation / 100);

    const existingPlacements = await prisma.projectPlacement.findMany({
      where: {
        projectId,
        status: PlacementStatus.ACTIVE,
      },
      include: {
        consultant: {
          select: { costToCompany: true },
        },
        project: {
          select: { endDate: true },
        }
      },
    });

    let totalExistingSpend = 0;

    for (const placement of existingPlacements) {
      const placementEnd = placement.endDate || placement.project.endDate;
      if (!placementEnd) continue;

      const days = this.calculateDaysBetween(placement.startDate, placementEnd);
      const cost =
        days * placement.consultant.costToCompany * (placement.allocation / 100);
      totalExistingSpend += cost;
    }

    const projectedTotalCost = totalExistingSpend + newPlacementCost;

    if (projectedTotalCost > projectBudget) {
      throw new ConflictException(
        `Budget exceeded. The project budget is ${projectBudget}. Current active placements cost ${totalExistingSpend}. Adding this consultant costs an additional ${newPlacementCost}, bringing the total projected cost to ${projectedTotalCost}.`,
      );
    }
  }


  private calculateDaysBetween(start: Date, end: Date): number {
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  async getRemainingCapacity(consultantId: string): Promise<number> {
    const consultant = await this.prisma.consultant.findUnique({
      where: { id: consultantId },
      select: { capacity: true },
    });
    if (!consultant) {
      throw new NotFoundException(
        `Consultant with ID ${consultantId} not found.`,
      );
    }
    return Math.max(0, consultant.capacity);
  }

  private async isProjectManagerForProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const record = await this.prisma.projectManager.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    return record !== null;
  }
}