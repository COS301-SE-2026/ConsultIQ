import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';


@Injectable()
export class AdminConsultantsService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }


    async deleteUser(userId: string) {

        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    deletedAt: new Date(),
                    status: 'SUSPENDED'
                }
            });

            return { message: 'User deleted successfully' };
        }
        catch (error) {
            if (error instanceof Object && 'code' in error && error.code === 'P2025') {
                throw new NotFoundException('User does not exist');
            } else {
                throw error;
            }
        }

    }

    async getAllUsers() {

        try {
            const consultants = await this.prisma.user.findMany({
                where: { deletedAt: null }
            });
            return consultants;
        }
        catch (error) {
            if (error instanceof Object && 'code' in error && error.code === 'P2025') {
                throw new NotFoundException('No users found');
            } else {
                throw error;
            }

        }
    }

    async activeUser(userId: string) {
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: { status: 'ACTIVE' }
            });

            return { message: 'User activated successfully' };
        }
        catch (error) {
            if (error instanceof Object && 'code' in error && error.code === 'P2025') {
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
                data: { status: 'SUSPENDED' }
            });

            return { message: 'User suspended successfully' };
        }
        catch (error) {
            if (error instanceof Object && 'code' in error && error.code === 'P2025') {
                throw new NotFoundException('User does not exist');
            } else {
                throw error;
            }
        }
    }
}

