import { apiClient } from "../lib/api-client";

export interface AddressComponents {
    long_name: string;
    short_name: string;
    types: string[];
}

export interface LocationDto {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    placeId: string;
    addressComponents: AddressComponents[];

}

export interface ParsedAddress {
    addressLine1: string;
    addressLine2: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
    formattedAddress?: string;
}

export const searchAddress = async (query: string): Promise<LocationDto> => {
    const params = new URLSearchParams({ q: query });
    return await apiClient.get<LocationDto>(`/location/search/?${params.toString()}`);

}



export const parseGoogleAddress = async (data: LocationDto): Promise<ParsedAddress> => {
    const components = data.addressComponents;
    function findComponent(addressType: string): string {
        const found = components.find(comp => comp.types.includes(addressType));
        return found ? found.long_name : "";
    }

    const streetNumber = findComponent("street_number");
    const streetName = findComponent("route");
    const addressLine1 = [streetNumber, streetName].filter(Boolean).join(" ");
    const premise = findComponent("premise");
    const subpremise = findComponent("subpremise");
    const addressLine2 = [premise, subpremise].filter(Boolean).join(", ");
    const suburb = findComponent("sublocality_level_1") || findComponent("sublocality") || findComponent("neighborhood");
    const city = findComponent("locality") || findComponent("postal_town") || findComponent("administrative_area_level_2");
    const province = findComponent("administrative_area_level_1");
    const postalCode = findComponent("postal_code");

    return {
        addressLine1,
        addressLine2,
        suburb,
        city,
        province,
        postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        placeId: data.placeId,
        formattedAddress: data.formattedAddress,

    };

};