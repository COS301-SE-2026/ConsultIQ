import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from '../repositories/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { PaginatedProjectsResponseDto, ProjectListItemDto } from '../dto/project-list.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) { }

  async createProject(dto: CreateProjectDto, userId: string, userRole: string) {
    if (userRole !== 'PROJECT_MANAGER' && userRole !== 'ADMIN') {
      throw new ForbiddenException('Only Project Managers can create projects.');
    }

    if (dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date.');
      }
    }

    const result = await this.projectRepository.createProject(dto, userId);

    return {
      message: 'Project created successfully',
      projectId: result.projectId,
    };
  }

  async getAllProjects(
    page: number,
    limit: number,
    userRole: string,
    userId: string | null,
  ): Promise<PaginatedProjectsResponseDto> {

    let projects: any[];
    let total: number;

    switch (userRole) {
      case 'ADMIN':
        ({ projects, total } = await this.projectRepository.getAllProjects(page, limit));
        break;

      case 'PROJECT_MANAGER':
        ({ projects, total } = await this.projectRepository.getProjectsByProjectManager(userId!, page, limit));
        break;

      case 'CONSULTANT_MANAGER':
        ({ projects, total } = await this.projectRepository.getProjectsByConsultantManager(userId!, page, limit));
        break;

      case 'CONSULTANT':
        ({ projects, total } = await this.projectRepository.getProjectsByConsultant(userId!, page, limit));
        break;

      default:
        throw new ForbiddenException('You do not have permission to view projects.');
    }

    const mappedProjects: ProjectListItemDto[] = projects.map((p) => ({
      id: p.id,
      projectName: p.projectName,
      clientName: p.clientName,
      city: p.city,
      province: p.province,
      startDate: p.startDate,
      endDate: p.endDate ?? null,
      teamSize: p.teamSize,
      requiredAllocationPercentage: p.requiredAllocationPercentage,
      clientBillingBudget: Number(p.clientBillingBudget),
      status: p.status,
      skillCount: p.skillCount,
    }));

    return { page, limit, total, projects: mappedProjects };
  }

  async getProjectById(projectId: string) {
    const project = await this.projectRepository.getProjectById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    return project;
  }
}