import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { TokenService } from '../../common/services/token.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../dto/create-user.dto';
import { ActivateAccountDto } from '../dto/activate-account.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private token: TokenService,
    private config: ConfigService,
  ) {}

  async createUser(dto: CreateUserDto) {
    // Check if a user with this email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    // Generate a secure activation token
    const { rawToken, hashedToken } = this.token.generateActivationToken();
    const expiry = this.token.getTokenExpiry();

    // Create the user record in the database
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
        status: 'PENDING',
        activationToken: hashedToken,
        activationTokenExpiry: expiry,
      },
    });

    // Build the activation link that goes in the email
    // The raw token goes in the URL, never the hashed one
    const appUrl = this.config.get<string>('APP_URL');
    const activationLink = `${appUrl}/activate?token=${rawToken}&email=${encodeURIComponent(dto.email)}`;

    // Send the activation email
    this.email.sendActivationEmail(
      user.email,
      user.fullName,
      activationLink,
    ).catch(err => {
      console.error('Failed to send activation email:', err);
    });

    return {
      message: 'Account created successfully. An activation email has been sent.',
      userId: user.id,
    };
  }

  async activateAccount(dto: ActivateAccountDto) {
    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    // Check the account is in the right state to be activated
    if (user.status === 'ACTIVE') {
      throw new BadRequestException('This account is already active.');
    }

    if (user.status === 'SUSPENDED') {
      throw new BadRequestException('This account has been suspended.');
    }

    // Check the token exists
    if (!user.activationToken || !user.activationTokenExpiry) {
      throw new BadRequestException('No activation token found for this account.');
    }

    // Check the token has not expired
    if (this.token.isTokenExpired(user.activationTokenExpiry)) {
      throw new BadRequestException(
        'This activation link has expired. Please contact your administrator to resend it.',
      );
    }

    // Hash the incoming token and compare against the stored hash
    const hashedIncomingToken = this.token.hashToken(dto.token);
    if (hashedIncomingToken !== user.activationToken) {
      throw new BadRequestException('Invalid activation token.');
    }

    // Hash the password using bcrypt with a cost factor of 12
    // Cost factor 12 means bcrypt runs 2^12 = 4096 iterations
    // making it slow enough to resist brute force attacks
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Update the user record — activate the account and clear the token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        activationToken: null,
        activationTokenExpiry: null,
      },
    });

    return {
      message: 'Account activated successfully. You can now log in.',
    };
  }
}