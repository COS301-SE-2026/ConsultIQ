import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlacementDto } from '../dto/create-placement.dto';
import { PlacementStatus, AuditAction } from '@prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
@Injectable()
export class PlacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

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
      select: { id: true, capacity: true, availability: true },
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
      },
    });
    if (existingPlacement) {
      throw new ConflictException(
        'This consultant is already placed on this project.',
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

    const placement = await this.prisma.$transaction(async (tx) => {
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
    });

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

    return {
      message: 'Placement created successfully.',
      placementId: placement.id,
    };
  }

  /**
    Computes a consultant's remaining capacity (as a percentage, 0-100) for a
    given period, by summing the allocation of all ACTIVE placements that
    overlap that period and subtracting from 100.
    A null endDate is treated as open-ended (overlaps everything from its
    startDate onward).
   **/
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
