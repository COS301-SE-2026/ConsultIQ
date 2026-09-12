import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserService } from './admin.user.service';
import { PrismaService } from '../../../prisma/prisma.service';


describe('AdminUserService', () => {
    let service: AdminUserService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminUserService,
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            update: jest.fn(),
                            findMany: jest.fn(),
                            count: jest.fn(),
                        },
                        $transaction: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AdminUserService>(AdminUserService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    // Getting all users with pagination

    describe('getAllusers with pagination', () => {
        it('Should get all users successfully with pagination', async () => {
            const mockUsers = [
                { id: '1', name: 'User 1', deletedAt: null, status: 'ACTIVE' },
                { id: '2', name: 'User 2', deletedAt: null, status: 'ACTIVE' },
                { id: '3', name: 'User 3', deletedAt: null, status: 'SUSPENDED' },
                { id: '4', name: 'User 4', deletedAt: null, status: 'SUSPENDED' },
                { id: '5', name: 'User 5', deletedAt: null, status: 'ACTIVE' },
                { id: '6', name: 'User 6', deletedAt: null, status: 'SUSPENDED' },
                { id: '7', name: 'User 7', deletedAt: null, status: 'ACTIVE' },
                { id: '8', name: 'User 8', deletedAt: null, status: 'SUSPENDED' },
                { id: '9', name: 'User 9', deletedAt: null, status: 'ACTIVE' },
                { id: '10', name: 'User 10', deletedAt: null, status: 'SUSPENDED' },
            ];
            const totalUsers = 10;

            (prisma.$transaction as jest.Mock).mockResolvedValue([mockUsers, totalUsers, 5, 5]);
            const result = await service.getAllUsers(1, 10);

            expect(result).toEqual({
                data: mockUsers,
                meta: {
                    totalRecords: totalUsers,
                    activeUsers: 5,
                    suspendedUsers: 5,
                    currentPage: 1,
                    totalPages: 1,
                },
            });
        });

        it('applies the search filter to both the list query and the count identically', async () => {
            (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0, 0, 0]);

            await service.getAllUsers(1, 10, 'jane');

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { fullName: { contains: 'jane', mode: 'insensitive' } },
                            { email: { contains: 'jane', mode: 'insensitive' } },
                        ],
                    }),
                }),
            );

            expect(prisma.user.count).toHaveBeenNthCalledWith(1, {
                where: expect.objectContaining({
                    OR: [
                        { fullName: { contains: 'jane', mode: 'insensitive' } },
                        { email: { contains: 'jane', mode: 'insensitive' } },
                    ],
                }),
            });
        });

        it('applies the role filter to the query', async () => {
            (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0, 0, 0]);

            await service.getAllUsers(1, 10, undefined, undefined,'CONSULTANT');

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ role: 'CONSULTANT' }),
                }),
            );
        });

        it('applies an explicit status filter, overriding the default "not PENDING" behaviour', async () => {
            (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0, 0, 0]);

            await service.getAllUsers(1, 10, undefined, 'ACTIVE');

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: 'ACTIVE' }),
                }),
            );
        });

        it('excludes PENDING status by default when no explicit status filter is given', async () => {
            (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0, 0, 0]);

            await service.getAllUsers(1, 10);

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: { not: 'PENDING' } }),
                }),
            );
        });

        it('regression: totalRecords reflects the filtered count, not the unfiltered total', async () => {
            const filteredUsers = [{ id: '1', name: 'Jane', deletedAt: null, status: 'ACTIVE' }];
            (prisma.$transaction as jest.Mock).mockResolvedValue([filteredUsers, 1, 1, 0]);

            const result = await service.getAllUsers(1, 10, 'Jane');

            expect(result.meta.totalRecords).toBe(1);
            expect(result.meta.totalPages).toBe(1);
        });
    });

    // Deleting a user


    describe('suspendUser', () => {

        it('should successfully suspend a user', async () => {
            const mockUpdatedUser = {
                id: '1',
                name: 'User 1',
                status: 'ACTIVE',
                deletedAt: new Date()
            };

            (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

            const result = await service.suspendUser('1');

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: {
                    status: 'SUSPENDED'
                },
            });

            expect(result).toEqual({ message: 'User suspended successfully' });


        });

        it('Suspending a non-existent user', async () => {
            const prismaError = { code: 'P2025' };

            (prisma.user.update as jest.Mock).mockRejectedValue(prismaError);

            await expect(service.suspendUser('2')).rejects.toThrow('User does not exist');

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: '2' },
                data: {
                    status: 'SUSPENDED'
                },
            });


        });

        it('Database error when trying to suspend a user', async () => {
            const genericError = new Error('Database connection lost');
            (prisma.user.update as jest.Mock).mockRejectedValue(genericError);

            await expect(service.suspendUser('1')).rejects.toThrow(genericError);
        });
    })

    describe('activateUser', () => {

        it('should successfully activate a user', async () => {
            const mockUpdatedUser = {
                id: '1',
                name: 'User 1',
                status: 'SUSPENDED',
                deletedAt: new Date()
            };

            (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

            const result = await service.activateUser('1');

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: {
                    status: 'ACTIVE'
                },
            });

            expect(result).toEqual({ message: 'User activated successfully' });


        });

        it('Activating a non-existent user', async () => {
            const prismaError = { code: 'P2025' };

            (prisma.user.update as jest.Mock).mockRejectedValue(prismaError);

            await expect(service.activateUser('2')).rejects.toThrow('User does not exist');

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: '2' },
                data: {
                    status: 'ACTIVE'
                },
            });


        });

        it('Database error when trying to activate a user', async () => {
            const genericError = new Error('Database connection lost');
            (prisma.user.update as jest.Mock).mockRejectedValue(genericError);

            await expect(service.activateUser('1')).rejects.toThrow(genericError);
        });


    })
})