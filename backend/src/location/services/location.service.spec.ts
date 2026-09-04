import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { InternalServerErrorException, Logger } from '@nestjs/common';

describe('LocationService', () => {
    let service: LocationService;
    const Env = process.env;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LocationService],
        }).compile();

        service = module.get<LocationService>(LocationService);

        process.env = { ...Env };

        global.fetch = jest.fn();

        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        process.env = Env;
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('searchAddress', () => {
        const mockAddress = '123 Mock street, Mock City, Mock Province';


        it('should throw InternalServerErrorException if GOOGLE_MAPS_API_KEY is missing', async () => {
            delete process.env.GOOGLE_MAPS_API_KEY;
            await expect(service.searchAddress(mockAddress)).rejects.toThrow(InternalServerErrorException);
            await expect(service.searchAddress(mockAddress)).rejects.toThrow('Missing GOOGLE_MAPS_API_KEY.');
        })

        it('should return mapped location when API is called and responds successfully', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'mock-api-key';

            const mockComponents = [
                { long_name: '1600', short_name: '1600', types: ['street_number'] },
                { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality', 'political'] }
            ];
            const mockResponse = {
                status: 'OK',
                results: [
                    {
                        formatted_address: '123 Mock street, Mock City, Mock Province',
                        geometry: {
                            location: {
                                lat: 12.34,
                                lng: 56.78,
                            },
                        },
                        place_id: 'mock-place-id',
                        address_components: mockComponents,
                    },
                ],
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse),
            });

            const result = await service.searchAddress(mockAddress);
            expect(result).toEqual({
                latitude: 12.34,
                longitude: 56.78,
                formattedAddress: '123 Mock street, Mock City, Mock Province',
                placeId: 'mock-place-id',
                addressComponents: mockComponents,
            });
        });

        it('should return null and log a warning if the API returns a status other than OK', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'valid_api_key';
            const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

            const mockApiResponse = {
                status: 'ZERO_RESULTS',
                results: [],
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockApiResponse),
            });

            const result = await service.searchAddress('Carnival City');

            expect(result).toBeNull();
            expect(loggerWarnSpy).toHaveBeenCalledWith(
                'Geocoding failed for address: Carnival City | status: ZERO_RESULTS',
            );
        });

        it('should throw InternalServerErrorException and log an error if fetch fails', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'valid_api_key';
            const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
            const mockError = new Error('Network timeout');

            (global.fetch as jest.Mock).mockRejectedValue(mockError);

            await expect(service.searchAddress(mockAddress)).rejects.toThrow(
                InternalServerErrorException,
            );
            await expect(service.searchAddress(mockAddress)).rejects.toThrow(
                'Error communicating with Google Maps API.',
            );
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                `Failed to search address: ${mockAddress}`,
                mockError,
            );
        });
    });

    describe('calculateTravelMetrics', () => {
        const mockOrigin = 'Pretoria, Gauteng';
        const mockDestination = 'Johannesburg, Gauteng';

        it('should throw InternalServerErrorException if GOOGLE_MAPS_API_KEY is missing', async () => {
            delete process.env.GOOGLE_MAPS_API_KEY;
            await expect(service.calculateTravelMetrics(mockOrigin, mockDestination)).rejects.toThrow(InternalServerErrorException);
            await expect(service.calculateTravelMetrics(mockOrigin, mockDestination)).rejects.toThrow('Missing GOOGLE_MAPS_API_KEY.');
        });

        it('should return travel metrics when API responds successfully with a valid route', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'mock-api-key';

            const mockResponse = {
                status: 'OK',
                rows: [
                    {
                        elements: [
                            {
                                status: 'OK',
                                distance: { value: 55000, text: '55 km' },
                                duration: { value: 3600, text: '1 hour mins' }
                            }
                        ]
                    }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse),
            });

            const result = await service.calculateTravelMetrics(mockOrigin, mockDestination);

            expect(result).toEqual({
                distanceMeters: 55000,
                distanceText: '55 km',
                durationSeconds: 3600,
                durationText: '1 hour mins',
            });
        });

        it('should return null and log a warning if no route is found between locations', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'mock-api-key';
            const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

            const mockResponse = {
                status: 'OK',
                rows: [
                    {
                        elements: [
                            {
                                status: 'ZERO_RESULTS'
                            }
                        ]
                    }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse),
            });

            const result = await service.calculateTravelMetrics(mockOrigin, mockDestination);

            expect(result).toBeNull();
            expect(loggerWarnSpy).toHaveBeenCalledWith(
                `No route found between ${mockOrigin} and ${mockDestination} | Element status: ZERO_RESULTS`
            );
        });

        it('should throw InternalServerErrorException and log an error if fetch fails', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'mock-api-key';
            const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
            const mockError = new Error('Network timeout');

            (global.fetch as jest.Mock).mockRejectedValue(mockError);

            await expect(service.calculateTravelMetrics(mockOrigin, mockDestination)).rejects.toThrow(
                InternalServerErrorException,
            );
            await expect(service.calculateTravelMetrics(mockOrigin, mockDestination)).rejects.toThrow(
                'Error communicating with Google Maps Distance Matrix API.',
            );
            expect(loggerErrorSpy).toHaveBeenCalledWith(
                `Failed to calculate distance for origin: ${mockOrigin}, dest: ${mockDestination}`,
                mockError,
            );
        });

        it('should return null and log a warning if the API top-level status is not OK (e.g., OVER_QUERY_LIMIT)', async () => {
            process.env.GOOGLE_MAPS_API_KEY = 'mock-api-key';
            const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

            const mockResponse = {
                status: 'REQUEST_DENIED',
                error_message: 'The provided API key is invalid.'
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                json: jest.fn().mockResolvedValue(mockResponse),
            });

            const result = await service.calculateTravelMetrics(mockOrigin, mockDestination);

            expect(result).toBeNull();
            expect(loggerWarnSpy).toHaveBeenCalledWith(
                `Distance Matrix API failed | status: REQUEST_DENIED`
            );
        });
    });
});