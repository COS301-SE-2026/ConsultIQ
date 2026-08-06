import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LocationService } from '../../location/services/location.service';

@Controller('location')
export class LocationController {
    constructor(private readonly locationService: LocationService) { }

    @Get('search')
    async searchLocation(@Query('q') query: string) {
        if (!query || query.trim() === '') {
            throw new BadRequestException('Search query is required');
        }
        return this.locationService.searchAddress(query);
    }
}