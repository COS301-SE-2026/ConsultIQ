import { Module } from '@nestjs/common';
import { LocationController } from '../controllers/location/location.controller';
import { LocationService } from './services/location.service';

@Module({
    controllers: [LocationController],
    providers: [LocationService],
    exports: [LocationService],

})
export class LocationModule { }