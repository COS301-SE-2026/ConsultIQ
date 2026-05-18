import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { ClientIp } from '../../common/decorators/client-ip.decorator';
import { UserAgent } from '../../common/decorators/user-agent.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   *
   * UC-AUTH-03 — Login with email + password.
   *
   * Success  -> 200 OK  { userId, email, role, dashboardRoute }
   * Invalid  -> 401 Unauthorized  (generic — no email/password hint)
   * Locked   -> 403 Forbidden
   * Pending  -> 403 Forbidden
   * Suspended-> 403 Forbidden
   * Too many -> 429 Too Many Requests  (HTTP-layer rate limit via ThrottlerGuard)
   */

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
