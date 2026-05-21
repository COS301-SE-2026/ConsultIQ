import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { ConsultantService } from "./consultant.service";
import { ConsultantRepository } from "../repositories/consultant.repository";

const mockConsultantRepository = {
  findEmail: jest.fn(),
  createConsultant: jest.fn(),
  getAllConsultants: jest.fn(),
  getConsultantById: jest.fn(),
};

describe("ConsultantService", () => {
  let service: ConsultantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultantService,
        { provide: ConsultantRepository, useValue: mockConsultantRepository },
      ],
    }).compile();

    service = module.get<ConsultantService>(ConsultantService);
    jest.clearAllMocks();
  });

  describe("createConsultant", () => {
    it("should create a consultant successfully", async () => {
      mockConsultantRepository.findEmail.mockResolvedValue(null);
      mockConsultantRepository.createConsultant.mockResolvedValue({ consultantId: "uuid-123" });

      const result = await service.createConsultant({
        name: "Jane",
        surname: "Smith",
        email: "jane@consultiq.com",
        location: "Johannesburg",
        costToCompany: 650,
        availability: true,
        idNumber: "1234567890",
        phoneNumber: "0123456789",
        skills: [],
        certifications: [],
      } as any);

      expect(result.message).toBe("Consultant created successfully");
      expect(result.consultantId).toBe("uuid-123");
    });

    it("should throw ConflictException if email already exists", async () => {
      mockConsultantRepository.findEmail.mockResolvedValue({ id: "existing" });

      await expect(service.createConsultant({ email: "jane@consultiq.com" } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe("getAllConsultants", () => {
    it("should return consultants with CTC for non-Project Manager", async () => {
      mockConsultantRepository.getAllConsultants.mockResolvedValue({
        consultants: [{
          id: "uuid-1",
          location: "Johannesburg",
          availability: "AVAILABLE",
          costToCompany: 650,
          user: { fullName: "Jane Smith", email: "jane@consultiq.com" },
          skills: [{ skill: { name: "java" } }],
          certificates: [],
        }],
        total: 1,
      });

      const result = await service.getAllConsultants(1, 10, "CONSULTANT_MANAGER");
      expect(result.consultants[0].costToCompanyRate).toBe(650);
    });

    it("should strip CTC for Project Manager", async () => {
      mockConsultantRepository.getAllConsultants.mockResolvedValue({
        consultants: [{
          id: "uuid-1",
          location: "Johannesburg",
          availability: "AVAILABLE",
          costToCompany: 650,
          user: { fullName: "Jane Smith", email: "jane@consultiq.com" },
          skills: [],
          certificates: [],
        }],
        total: 1,
      });

      const result = await service.getAllConsultants(1, 10, "PROJECT_MANAGER");
      expect(result.consultants[0].costToCompanyRate).toBeUndefined();
    });
  });
});
