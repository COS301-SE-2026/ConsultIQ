// import { Test, TestingModule } from '@nestjs/testing';
// import { ConsultantService } from '../services/consultant.service';
// import { ConsultantRepository } from '../repositories/consultant.repository';
// import { ConflictException } from '@nestjs/common';
//
// const mockConsultants = [
//   {
//     id: 'uuid-1',
//     location: 'Johannesburg',
//     availability: 'AVAILABLE',
//     costToCompany: 650,
//     user: { fullName: 'Jane Smith', email: 'jane@consultiq.com' },
//     skills: [{ skill: { name: 'java' } }, { skill: { name: 'react' } }],
//   },
// ];
//
// const mockConsultantRepository = {
//   findEmail: jest.fn(),
//   createConsultant: jest.fn(),
//   getAllConsultants: jest.fn(),
// };
//
// describe('ConsultantService - getAllConsultants', () => {
//   let service: ConsultantService;
//
//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         ConsultantService,
//         { provide: ConsultantRepository, useValue: mockConsultantRepository },
//       ],
//     }).compile();
//
//     service = module.get<ConsultantService>(ConsultantService);
//     jest.clearAllMocks();
//   });
//
//   it('should return consultants with CTC for Consultant Manager', async () => {
//     mockConsultantRepository.getAllConsultants.mockResolvedValue({
//       consultants: mockConsultants,
//       total: 1,
//     });
//
//     const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');
//
//     expect(result.consultants[0].costToCompanyRate).toBe(650);
//     expect(result.total).toBe(1);
//     expect(result.page).toBe(1);
//   });
//
//   it('should strip CTC for Project Manager', async () => {
//     mockConsultantRepository.getAllConsultants.mockResolvedValue({
//       consultants: mockConsultants,
//       total: 1,
//     });
//
//     const result = await service.getAllConsultants(1, 10, 'PROJECT_MANAGER');
//
//     expect(result.consultants[0].costToCompanyRate).toBeUndefined();
//   });
//
//   it('should return correct primary skills', async () => {
//     mockConsultantRepository.getAllConsultants.mockResolvedValue({
//       consultants: mockConsultants,
//       total: 1,
//     });
//
//     const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');
//
//     expect(result.consultants[0].primarySkills).toEqual(['java', 'react']);
//   });
//
//   it('should return empty list when no consultants', async () => {
//     mockConsultantRepository.getAllConsultants.mockResolvedValue({
//       consultants: [],
//       total: 0,
//     });
//
//     const result = await service.getAllConsultants(1, 10, 'CONSULTANT_MANAGER');
//
//     expect(result.consultants).toHaveLength(0);
//     expect(result.total).toBe(0);
//   });
//
//   it('should create a consultant successfully', async () => {
//   mockConsultantRepository.findEmail.mockResolvedValue(null);
//   mockConsultantRepository.createConsultant.mockResolvedValue({
//     consultantId: 'uuid-123',
//   });
//
//   const mockDto = {
//     fullName: 'Jane Smith',
//     email: 'jane@consultiq.com',
//     location: 'Johannesburg',
//     costToCompanyRate: 650,
//     availabilityStatus: 'AVAILABLE',
//     skills: [],
//     certifications: [],
//   };
//
//   const result = await service.createConsultant(mockDto as any);
//   expect(result.message).toBe('Consultant created successfully');
//   expect(result.consultantId).toBe('uuid-123');
// });
//
// it('should throw ConflictException if email already exists', async () => {
//   mockConsultantRepository.findEmail.mockResolvedValue({ id: 'existing' });
//
//   const mockDto = {
//     fullName: 'Jane Smith',
//     email: 'jane@consultiq.com',
//     location: 'Johannesburg',
//     costToCompanyRate: 650,
//     availabilityStatus: 'AVAILABLE',
//     skills: [],
//     certifications: [],
//   };
//
//   await expect(service.createConsultant(mockDto as any)).rejects.toThrow(ConflictException);
// });
// });