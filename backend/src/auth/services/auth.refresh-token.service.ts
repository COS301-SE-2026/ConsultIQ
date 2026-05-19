import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../../common/services/token.service';

@Injectable()
export class RefreshTokenService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly token: TokenService,
    ) { }

    /**
     * Called at login — creates the first refresh token in a new family.
     * familyId groups all rotated tokens from the same login session together
     * so we can revoke them all if replay is detected.
     */
    async createRefreshToken(userId: string, familyId?: string): Promise<string> {
        const { rawToken, hashedToken } = this.token.generateRefreshToken();
        const expiry = this.token.getRefreshTokenExpiry();

        await this.prisma.token.create({
            data: {
                userId,
                token: hashedToken,
                type: 'REFRESH',
                expiresAt: expiry,
                familyId: familyId ?? crypto.randomUUID(),
            },
        });

        return rawToken;
    }

    /**
     * TASK-17: Validate incoming refresh token and issue new JWT + refresh token.
     * TASK-18 & 19: Rotation + replay attack detection via familyId.
     */
    async refresh(
        rawToken: string,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const hashedToken = this.token.hashToken(rawToken);

        const stored = await this.prisma.token.findFirst({
            where: {
                token: hashedToken,
                type: 'REFRESH',
            },
            include: { user: true },
        });

        // Token not found at all
        if (!stored) {
            throw new UnauthorizedException('Invalid refresh token.');
        }

        // TASK-18 & 19 - Replay attack detection
        // usedAt means this token was already rotated 
        if (stored.usedAt) {
            // Revoke entire family 
            await this.prisma.token.updateMany({
                where: {
                    familyId: stored.familyId,
                    type: 'REFRESH',
                },
                data: { usedAt: new Date() },
            });

            throw new UnauthorizedException(
                'Refresh token reuse detected. Please log in again.',
            );
        }

        // Token expired
        if (this.token.isTokenExpired(stored.expiresAt)) {
            throw new UnauthorizedException(
                'Refresh token has expired. Please log in again.',
            );
        }

        // Mark current token as used
        await this.prisma.token.update({
            where: { id: stored.id },
            data: { usedAt: new Date() },
        });

        // Issue new JWT access token
        const accessToken = this.jwt.sign({
            userId: stored.userId,
            role: stored.user.role,
        });

        // Issue new refresh token in same family
        const newRefreshToken = await this.createRefreshToken(
            stored.userId,
            stored.familyId || undefined,
        );

        return { accessToken, refreshToken: newRefreshToken };
    }

    /**
     * Called on logout - revokes all active refresh tokens for this user.
     */
    async revokeAllForUser(userId: string): Promise<void> {
        await this.prisma.token.updateMany({
            where: {
                userId,
                type: 'REFRESH',
                usedAt: null,
            },
            data: { usedAt: new Date() },
        });
    }
    async revokeTokenFamily(rawToken: string): Promise<void> {
        const hashedToken = this.token.hashToken(rawToken);

        const stored = await this.prisma.token.findFirst({
            where: { token: hashedToken, type: 'REFRESH' },
        });

        if (!stored?.familyId) return;

        await this.prisma.token.updateMany({
            where: { familyId: stored.familyId, type: 'REFRESH' },
            data: { usedAt: new Date() },
        });
    }
}
