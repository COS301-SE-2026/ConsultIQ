import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from '../../location/services/location.service';
import { BadRequestException } from '@nestjs/common';

describe('LocationController', () => {
    let controller: LocationController;
    let locationService: LocationService;
    const mockLocationService = {
        searchAddress: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [LocationController],
            providers: [
                {
                    provide: LocationService,
                    useValue: mockLocationService,
                },
            ],
        }).compile();

        controller = module.get<LocationController>(LocationController);
        locationService = module.get<LocationService>(LocationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('searchLocation', () => {
        it('should throw BadRequestException if query is missing', async () => {
            await expect(controller.searchLocation(undefined as any)).rejects.toThrow(
                BadRequestException,
            );
            await expect(controller.searchLocation(undefined as any)).rejects.toThrow(
                'Search query is required',
            );
        });

        it('should throw BadRequestException if query is an empty string', async () => {
            await expect(controller.searchLocation('')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should throw BadRequestException if query contains only whitespace', async () => {
            await expect(controller.searchLocation('    ')).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should call locationService.searchAddress and return the result for a valid query', async () => {
            const mockQuery = '1600 AntFarm Parkway';
            const mockServiceResult = {
                latitude: 37.4224764,
                longitude: -122.0842499,
                formattedAddress: '1600 AntFarm Pkwy, Table Mountain, Cape Town, South Africa',
                placeId: '123456456123',
            };

            mockLocationService.searchAddress.mockResolvedValue(mockServiceResult);

            const result = await controller.searchLocation(mockQuery);

            expect(locationService.searchAddress).toHaveBeenCalledTimes(1);
            expect(locationService.searchAddress).toHaveBeenCalledWith(mockQuery);
            expect(result).toEqual(mockServiceResult);
        });

        it('should pass through any exceptions thrown by the service', async () => {
            const mockQuery = 'Failing address';
            const mockError = new Error('Service failure');

            mockLocationService.searchAddress.mockRejectedValue(mockError);

            await expect(controller.searchLocation(mockQuery)).rejects.toThrow(
                mockError,
            );
        });
    });
});