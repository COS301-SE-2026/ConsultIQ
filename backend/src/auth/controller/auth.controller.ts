import {
    Controller,
    Post,
    Body,
    Req,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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
    async login(@Body() dto: LoginDto, @Req() req: Request) {
        const result = await this.authService.login(dto, req);

        return {
            statusCode: HttpStatus.OK,
            message: 'Login successful.',
            data: result,
        };
    }
}