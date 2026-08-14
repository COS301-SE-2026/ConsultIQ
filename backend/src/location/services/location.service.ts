import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

@Injectable()
export class LocationService {
    private readonly logger = new Logger(LocationService.name);


    async searchAddress(address: string) {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException('Missing GOOGLE_MAPS_API_KEY.');

        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                return {
                    latitude: result.geometry.location.lat,
                    longitude: result.geometry.location.lng,
                    formattedAddress: result.formatted_address,
                    placeId: result.place_id,
                    addressComponents: result.address_components,
                };
            } else {
                this.logger.warn(`Geocoding failed for address: ${address} | status: ${data.status}`);
                return null;
            }
        } catch (error) {
            this.logger.error(`Failed to search address: ${address}`, error);
            throw new InternalServerErrorException('Error communicating with Google Maps API.');
        }
    }

}