import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Req,
  Res,
  UnauthorizedException,
  Get,
  Request,
} from '@nestjs/common';
import * as express from 'express';
import { randomBytes } from 'crypto';
import { AuthService } from '../../auth/services/auth.service';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { ActivateAccountDto } from '../../auth/dto/activate-account.dto';
import { ResendVerificationDto } from '../../auth/dto/resend-verification.dto';
import { AcceptTermsDto } from '../../auth/dto/accept-terms.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ClientIp } from '../../common/decorators/client-ip.decorator';
import { UserAgent } from '../../common/decorators/user-agent.decorator';
import { LoginDto } from '../../auth/dto/login.dto';
import { ForgotPasswordDto } from '../../auth/dto/forgot-password.dto';
// import { UseGuards } from '@nestjs/common';
// import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Role } from '../../auth/enums/role.enum';
import { Roles } from '../../common/guards/roles.guard';
import { RefreshTokenService } from '../../auth/services/auth.refresh-token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly prisma: PrismaService,
  ) { }

  private setCsrfCookie(res: any): void {
    const csrfToken = randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      maxAge: 5 * 60 * 1000,
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.CONSULTANT_MANAGER) // Only admins can create new users and consultant managers can create consultants
  async register(
    @Body() dto: CreateUserDto,
    @Req() req: Express.Request,
  ): Promise<{ message: string; userId: string }> {
    const requestingUser = req.user;
    // Consultant managers can only register CONSULTANTs
    if (
      (requestingUser?.role as string) ===
      (Role.CONSULTANT_MANAGER as string) &&
      (dto.role as string) !== 'CONSULTANT'
    ) {
      throw new ForbiddenException(
        'Consultant managers can only register Consultant accounts',
      );
    }
    return await this.authService.createUser(dto);
  }

  @Public()
  @SkipCsrf()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Body() dto: ActivateAccountDto,
  ): Promise<{ message: string }> {
    return await this.authService.activateAccount(dto);
  }

  @Public()
  @SkipCsrf()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return await this.authService.resendVerification(dto.email);
  }

  @Public()
  @SkipCsrf()
  @Post('accept-terms')
  @HttpCode(HttpStatus.OK)
  async acceptTerms(@Body() dto: AcceptTermsDto): Promise<{ message: string }> {
    return await this.authService.acceptTerms(dto.email);
  }

  @Public()
  @SkipCsrf()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @ClientIp() ip: string,
    @UserAgent() userAgent: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);

    // Set tokens as HTTP-only cookies
    res.cookie('ciq_access_token', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('ciq_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    this.setCsrfCookie(res);

    // Return user data only

    const userProfile = Object.fromEntries(
      Object.entries(result as unknown as Record<string, unknown>).filter(
        ([key]) => key !== 'accessToken' && key !== 'refreshToken',
      ),
    );
    return {
      message: 'Login successful.',
      result: userProfile,
    };
  }

  @Public()
  @SkipCsrf()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @SkipCsrf()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ActivateAccountDto,
  ): Promise<{ message: string }> {
    return await this.authService.resetPassword(dto);
  }

  // TASK-17: Validate refresh token and issue new JWT + refresh token
  @Public()
  @SkipCsrf()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: any,
  ) {
    const refreshToken = req.cookies['ciq_refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const tokens = await this.refreshTokenService.refresh(refreshToken);

    res.cookie('ciq_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('ciq_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    this.setCsrfCookie(res);

    return { message: 'Token refreshed successfully.' };
  }

  // Revokes all refresh tokens for the requesting user
  @SkipCsrf()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ): Promise<{ message: string }> {
    await this.refreshTokenService.revokeAllForUser(req.user!.userId);

    // Clear both cookies
    res.clearCookie('ciq_access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.clearCookie('ciq_refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.clearCookie('XSRF-TOKEN', {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
    });

    return { message: 'Logged out successfully.' };
  }

  @Get('me')
  async getProfile(@Request() req: any) {
    const user = req.user;

    // Fetch the fresh user details from the database to get the email field
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User account no longer exists.');
    }

    const ROLE_DASHBOARD_MAP: Record<string, string> = {
      ADMIN: '/admin',
      PROJECT_MANAGER: '/projects',
      CONSULTANT_MANAGER: '/consultants-manager',
      CONSULTANT: '/profile-view',
    };

    return {
      message: 'Profile retrieved successfully.',
      result: {
        userId: user.userId,
        email: dbUser.email,
        role: user.role,
        dashboardRoute: ROLE_DASHBOARD_MAP[user.role] || '/profile',
      },
    };
  }
}
