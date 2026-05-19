import { BadRequestException, Injectable } from '@nestjs/common';
import { ProjectRepository } from '../repositories/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { PaginatedProjectsResponseDto, ProjectListItemDto } from '../dto/project-list.dto';

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async createProject(dto: CreateProjectDto) {
    if (dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date.');
      }
    }

    const result = await this.projectRepository.createProject(dto);

    return {
      message: 'Project created successfully',
      projectId: result.projectId,
    };
  }

  async getAllProjects(page: number, limit: number): Promise<PaginatedProjectsResponseDto> {
    const { projects, total } = await this.projectRepository.getAllProjects(page, limit);

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

        return {
            page,
            limit,
            total,
            projects: mappedProjects,
        };
    }
}