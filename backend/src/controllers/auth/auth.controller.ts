import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { ActivateAccountDto } from '../../auth/dto/activate-account.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateAccountDto) {
    return this.authService.activateAccount(dto);
  }
}