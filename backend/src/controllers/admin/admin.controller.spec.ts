import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminUserService } from '../../admin/users/services/admin.user.service';
import { AdminProjectService } from '../../admin/projects/services/admin.projects.service';
import { UnauthorizedException } from '@nestjs/common';

const mockAdminProjectService = {
    archiveProject: jest.fn(),
    unarchiveProject: jest.fn(),
    getAllProjects: jest.fn(),
};

const mockAdminUserService = {
    deleteUser: jest.fn(),
    getAllUsers: jest.fn(),
    activateUser: jest.fn(),
    suspendUser: jest.fn(),
};


describe('AdminController', () => {
    let controller: AdminController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [
                { provide: AdminUserService, useValue: mockAdminUserService },
                { provide: AdminProjectService, useValue: mockAdminProjectService },
            ],
        }).compile();

        controller = module.get<AdminController>(AdminController);
        jest.clearAllMocks();
    });


    describe('AdminUserService', () => {

        describe('deleteUser', () => {
            it('Successfully delete a user', async () => {

                mockAdminUserService.deleteUser.mockResolvedValue({
                    message: 'User deleted successfully'
                });

                const result = await controller.deleteUser('user-uuid-1234');
                expect(result.message).toBe('User deleted successfully');
                expect(mockAdminUserService.deleteUser).toHaveBeenCalledWith('user-uuid-1234');
            });

        });

        describe('getAllUsers', () => {
            it('Successfully get all users', async () => {

                mockAdminUserService.getAllUsers.mockResolvedValue({
                    data: [
                        { id: 'user-uuid-1234', name: 'John Doe' }
                    ]
                });

                const result = await controller.getAllUsers();
                expect(result.data.length).toBe(1);
                expect(mockAdminUserService.getAllUsers).toHaveBeenCalled();
            });
        });

        describe('suspendUser', () => {
            it('Successfully suspend a user', async () => {

                mockAdminUserService.suspendUser.mockResolvedValue({
                    message: 'User suspended successfully'
                });

                const result = await controller.suspendUser('user-uuid-1234');
                expect(result.message).toBe('User suspended successfully');
                expect(mockAdminUserService.suspendUser).toHaveBeenCalledWith('user-uuid-1234');
            });
        });

        describe('activateUser', () => {
            it('Successfully activate a user', async () => {

                mockAdminUserService.activateUser.mockResolvedValue({
                    message: 'User activated successfully'
                });

                const result = await controller.activateUser('user-uuid-1234');
                expect(result.message).toBe('User activated successfully');
                expect(mockAdminUserService.activateUser).toHaveBeenCalledWith('user-uuid-1234');
            });
        });


    });


    describe('AdminProjectService', () => {

        describe('archiveProject', () => {
            it('Successfully archive a project', async () => {

                mockAdminProjectService.archiveProject.mockResolvedValue({
                    message: 'Project archived successfully'
                });
                const req = { user: { userId: 'admin-uuid-1234' } };
                await controller.archiveProject('project-uuid-1234', req);
                expect(mockAdminProjectService.archiveProject).toHaveBeenCalledWith('project-uuid-1234', 'admin-uuid-1234');
            });

            it('Throw exception if adminUserId is missing', async () => {
                const req = { user: {} };

                await expect(controller.archiveProject('project-uuid-1234', req)).rejects.toThrow(UnauthorizedException);
            });

        });

        describe('getAllProjects', () => {
            it('Successfully get all projects', async () => {

                mockAdminProjectService.getAllProjects.mockResolvedValue({
                    data: [
                        { id: 'project-uuid-1234', name: 'Project 1' }
                    ]
                });

                const result = await controller.getAllProjects();
                expect(result.data.length).toBe(1);
                expect(mockAdminProjectService.getAllProjects).toHaveBeenCalled();
            });
        });

        describe('unarchiveProject', () => {
            it('Successfully unarchive a project', async () => {

                mockAdminProjectService.unarchiveProject.mockResolvedValue({
                    message: 'Project unarchived successfully'
                });
                const req = { user: { userId: 'admin-uuid-1234' } };
                await controller.unarchiveProject('project-uuid-1234', req);
                expect(mockAdminProjectService.unarchiveProject).toHaveBeenCalledWith('project-uuid-1234', 'admin-uuid-1234');
            });
            it('Throw exception if adminUserId is missing', async () => {
                const req = { user: {} };

                await expect(controller.unarchiveProject('project-uuid-1234', req)).rejects.toThrow(UnauthorizedException);
            });

        });
    });




});

