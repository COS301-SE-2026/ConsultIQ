import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../auth/enums/role.enum';
import { AssignRoleDto } from '../dto/assign-role.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assignRole(
    targetUserId: string,
    assignRoleDto: AssignRoleDto,
    performedById: string,
  ): Promise<{ message: string }> {
    if (targetUserId === performedById) {
      throw new BadRequestException('You cannot change your own role.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException(
        `Target user with id ${targetUserId} not found.`,
      );
    }

    if ((targetUser.role as string) === (assignRoleDto.role as string)) {
      throw new BadRequestException(
        `Target user already has the role ${assignRoleDto.role}.`,
      );
    }

    if ((assignRoleDto.role as string) === (Role.SUPER_ADMIN as string)) {
      throw new BadRequestException(
        'The SUPER_ADMIN role cannot be assigned through this method.',
      );
    }

    if ((targetUser.role as string) === (Role.SUPER_ADMIN as string)) {
      throw new BadRequestException(
        'The role of a SUPER_ADMIN account cannot be changed through the API.',
      );
    }

    const previousRole = targetUser.role;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { role: assignRoleDto.role },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          performedById,
          targetUserId,
          previousValue: previousRole,
          newValue: assignRoleDto.role,
          action: 'ROLE_CHANGED',
        },
      }),
    ]);

    this.logger.log(
      `Role changed: User ${performedById} changed role of user ${targetUserId} from ${previousRole} to ${assignRoleDto.role}`,
    );

    return {
      message: `Role of user ${targetUserId} changed from ${previousRole} to ${assignRoleDto.role} successfully.`,
    };
  }
}
