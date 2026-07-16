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

    /**
     * Assigns a role to a target user.
     * SUPER_ADMIN role cannot be assigned through this method.
     * Logs the action for auditing purposes.
     */
    async assignRole(
        targetUserId: string,
        assignRoleDto: AssignRoleDto,
        performedById: string,
    ): Promise<{ message: string }> {
        // Prevent self-role changes
        if (targetUserId === performedById) {
            throw new BadRequestException(
                'You cannot change your own role.',
            );
        }

        // Fetch the target user
        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, role: true },
        });

        if (!targetUser) {
            throw new NotFoundException(`Target user with id ${targetUserId} not found.`);
        };

        // Prevent assigning a role that is the same as the current role
        if (targetUser.role === assignRoleDto.role) {
            throw new BadRequestException(
                `Target user already has the role ${assignRoleDto.role}.`,
            );
        }

        // Prevent assigning SUPER_ADMIN role through this method
        if (assignRoleDto.role === Role.SUPER_ADMIN) {
            throw new BadRequestException(
                'The SUPER_ADMIN role cannot be assigned through this method.',
            );
        }

        // Prevent changing the role of a SUPER_ADMIN user
        if (targetUser.role === Role.SUPER_ADMIN) {
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

        return { message: `Role of user ${targetUserId} changed from ${previousRole} to ${assignRoleDto.role} successfully.` };
    };
}