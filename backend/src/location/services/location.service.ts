import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

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


  async calculateTravelMetrics(origin: string, destination: string) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Missing GOOGLE_MAPS_API_KEY.');
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const element = data.rows[0]?.elements[0];

        if (element?.status === 'OK') {
          return {
            distanceMeters: element.distance.value,
            distanceText: element.distance.text,
            durationSeconds: element.duration.value,
            durationText: element.duration.text,
          };
        } else {
          this.logger.warn(`No route found between ${origin} and ${destination} | Element status: ${element?.status}`);
          return null;
        }
      } else {
        this.logger.warn(`Distance Matrix API failed | status: ${data.status}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to calculate distance for origin: ${origin}, dest: ${destination}`, error);
      throw new InternalServerErrorException('Error communicating with Google Maps Distance Matrix API.');
    }
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
        this.logger.warn(
          `Geocoding failed for address: ${address} | status: ${data.status}`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to search address: ${address}`, error);
      throw new InternalServerErrorException(
        'Error communicating with Google Maps API.',
      );
    }
  }
}
