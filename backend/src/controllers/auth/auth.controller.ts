import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { ActivateAccountDto } from '../../auth/dto/activate-account.dto';
import { ResendVerificationDto } from '../../auth/dto/resend-verification.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public() // Mark the entire controller as public (no auth required) since it only contains registration-related endpoints.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: CreateUserDto,
  ): Promise<{ message: string; userId: string }> {
    return await this.authService.createUser(dto);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Body() dto: ActivateAccountDto,
  ): Promise<{ message: string }> {
    return await this.authService.activateAccount(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return await this.authService.resendVerification(dto.email);
  }
}
