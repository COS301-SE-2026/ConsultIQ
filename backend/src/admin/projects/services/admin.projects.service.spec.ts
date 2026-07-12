import { Test, TestingModule } from '@nestjs/testing';
import { AdminProjectService } from './admin.projects.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AdminProjectService', () => {
    let service: AdminProjectService;
    let prisma: PrismaService;

    beforeEach(async () => {

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminProjectService,
                {
                    provide: PrismaService,
                    useValue: {
                        project: {
                            update: jest.fn(),
                            findMany: jest.fn(),
                            count: jest.fn(),
                        },
                        projectAuditLog: {
                            create: jest.fn(),
                        },
                        $transaction: jest.fn(),
                    },
                },
            ],


        }).compile();

        service = module.get<AdminProjectService>(AdminProjectService);
        prisma = module.get<PrismaService>(PrismaService);

        (prisma.$transaction as jest.Mock).mockImplementation((callback) => {
            if (typeof callback === 'function') {
                return callback(prisma);
            }
            return Promise.resolve(callback);
        });
    });

    // Getting all projects with pagination

    describe('getAllProjects with pagination', () => {
        it('Should get all projects successfully with pagination', async () => {
            const mockProjects = [
                { id: '1', ProjectName: 'User 1', status: 'OPEN' },
                { id: '2', ProjectName: 'User 2', status: 'OPEN' },
                { id: '3', ProjectName: 'User 3', status: 'OPEN' },
                { id: '4', ProjectName: 'User 4', status: 'OPEN' },
                { id: '5', ProjectName: 'User 5', status: 'OPEN' },
                { id: '6', ProjectName: 'User 6', status: 'OPEN' },
                { id: '7', ProjectName: 'User 7', status: 'OPEN' },
                { id: '8', ProjectName: 'User 8', status: 'OPEN' },
                { id: '9', ProjectName: 'User 9', status: 'OPEN' },
                { id: '10', ProjectName: 'User 10', status: 'OPEN' },
            ];
            const totalUsers = 10;

            (prisma.$transaction as jest.Mock).mockResolvedValue([mockProjects, totalUsers, 10]);
            const result = await service.getAllProjects(1, 10);

            expect(prisma.$transaction).toHaveBeenCalledWith([
                prisma.project.findMany({
                    where: { archivedAt: null, status: { not: 'ARCHIVED' } },
                    skip: 0,
                    take: 10,
                }),
                prisma.project.count({
                    where: { archivedAt: null, status: { not: 'ARCHIVED' } },
                }),
                prisma.project.count(),
            ]);

            expect(result).toEqual({
                data: mockProjects,
                meta: {
                    totalRecords: totalUsers,
                    absoluteTotalRecords: mockProjects.length,
                    currentPage: 1,
                    totalPages: 1,
                },
            });
        });
    })

    // Archiving a project
    describe('archiveProject', () => {

        it('should successfully archive a project', async () => {
            const mockUpdatedProject = {
                id: '1',
                name: 'Project 1',
                status: 'ACTIVE',
                archivedAt: new Date()
            };

            (prisma.project.update as jest.Mock).mockResolvedValue(mockUpdatedProject);

            const result = await service.archiveProject('1', 'admin-user-id');

            expect(prisma.project.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: {
                    archivedAt: expect.any(Date),
                    status: 'ARCHIVED'
                },
            });

            expect(result).toEqual({ message: 'Project archived successfully' });


        });

        it('Archiving a non-existent project', async () => {
            const prismaError = { code: 'P2025' };

            (prisma.project.update as jest.Mock).mockRejectedValue(prismaError);

            await expect(service.archiveProject('2', 'admin-user-id')).rejects.toThrow('Project does not exist');

            expect(prisma.project.update).toHaveBeenCalledWith({
                where: { id: '2' },
                data: {
                    archivedAt: expect.any(Date),
                    status: 'ARCHIVED'
                },
            });


        });

        it('Database error when trying to archive a project', async () => {
            const genericError = new Error('Database connection lost');
            (prisma.project.update as jest.Mock).mockRejectedValue(genericError);

            await expect(service.archiveProject('1', 'admin-user-id')).rejects.toThrow(genericError);
        });


    })


    describe('unarchiveProject', () => {

        it('should successfully unarchive a project', async () => {
            const mockUpdatedProject = {
                id: '1',
                name: 'Project 1',
                status: 'ARCHIVED',
                archivedAt: new Date()
            };

            (prisma.project.update as jest.Mock).mockResolvedValue(mockUpdatedProject);

            const result = await service.unarchiveProject('1', 'admin-user-id');

            expect(prisma.project.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: {
                    archivedAt: null,
                    status: 'OPEN'
                },
            });

            expect(result).toEqual({ message: 'Project unarchived successfully' });


        });

        it('Unarchiving a non-existent project', async () => {
            const prismaError = { code: 'P2025' };

            (prisma.project.update as jest.Mock).mockRejectedValue(prismaError);

            await expect(service.unarchiveProject('2', 'admin-user-id')).rejects.toThrow('Project does not exist');

            expect(prisma.project.update).toHaveBeenCalledWith({
                where: { id: '2' },
                data: {
                    archivedAt: null,
                    status: 'OPEN'
                },
            });


        });

        it('Database error when trying to unarchive non existent project', async () => {
            const genericError = new Error('Database connection lost');
            (prisma.project.update as jest.Mock).mockRejectedValue(genericError);

            await expect(service.unarchiveProject('1', 'admin-user-id')).rejects.toThrow(genericError);
        });


    })


})