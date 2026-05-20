// import { BadRequestException, Injectable } from '@nestjs/common';
// import { ProjectRepository } from '../repositories/project.repository';
// import { CreateProjectDto } from '../dto/create-project.dto';
//
// @Injectable()
// export class ProjectService {
//   constructor(private readonly projectRepository: ProjectRepository) {}
//
//   async createProject(dto: CreateProjectDto) {
//     if (dto.endDate) {
//       const start = new Date(dto.startDate);
//       const end = new Date(dto.endDate);
//       if (end <= start) {
//         throw new BadRequestException('End date must be after start date.');
//       }
//     }
//
//     const result = await this.projectRepository.createProject(dto);
//
//     return {
//       message: 'Project created successfully',
//       projectId: result.projectId,
//     };
//   }
// }