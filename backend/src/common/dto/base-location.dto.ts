import { IsString, IsOptional, IsNumber } from 'class-validator';

export class BaseLocationDto {
  @IsString()
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  suburb?: string;

  @IsString()
  city!: string;

  @IsString()
  province!: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  formattedAddress?: string;
}
