import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { ActivateAccountDto } from '../../auth/dto/activate-account.dto';
import { ResendVerificationDto } from '../../auth/dto/resend-verification.dto';
import { AcceptTermsDto } from '../../auth/dto/accept-terms.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ClientIp } from '../../common/decorators/client-ip.decorator';
import { UserAgent } from '../../common/decorators/user-agent.decorator';
import { LoginDto } from '../../auth/dto/login.dto';
import { UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

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

  @Post('accept-terms')
  @HttpCode(HttpStatus.OK)
  async acceptTerms(
    @Body() dto: AcceptTermsDto,
  ): Promise<{ message: string }> {
    return await this.authService.acceptTerms(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60000 } }) // Limit to 5 login attempts per minute per IP
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @ClientIp() ip: string,
    @UserAgent() userAgent: string,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);

    // Transormer service formats the shape
    return {
      message: 'Login successful.',
      result,
    };
  }
}
