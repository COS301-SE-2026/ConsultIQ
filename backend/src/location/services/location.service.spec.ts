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
});