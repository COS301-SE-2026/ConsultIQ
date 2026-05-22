import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from '../../services/auth.refresh-token.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../../../common/services/token.service';

describe('RefreshTokenService', () => {
    let service: RefreshTokenService;
    let prisma: jest.Mocked<PrismaService>;
    let jwt: jest.Mocked<JwtService>;
    let token: jest.Mocked<TokenService>;

    const mockUser = {
        id: 'user-123',
        email: 'jane@consultiq.com',
        role: 'CONSULTANT',
    };

    const mockTokenRecord = {
        id: 'token-123',
        userId: 'user-123',
        token: 'hashed-token',
        type: 'REFRESH',
        familyId: 'family-abc',
        usedAt: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
        user: mockUser,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RefreshTokenService,
                {
                    provide: PrismaService,
                    useValue: {
                        token: {
                            create: jest.fn() as any,
                            findFirst: jest.fn() as any,
                            update: jest.fn() as any,
                            updateMany: jest.fn() as any,
                        },
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('signed-jwt-token'),
                    },
                },
                {
                    provide: TokenService,
                    useValue: {
                        generateRefreshToken: jest.fn().mockReturnValue({
                            rawToken: 'raw-token-abc',
                            hashedToken: 'hashed-token-abc',
                        }),
                        hashToken: jest.fn().mockReturnValue('hashed-token'),
                        isTokenExpired: jest.fn().mockReturnValue(false),
                        getRefreshTokenExpiry: jest.fn().mockReturnValue(
                            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        ),
                    },
                },
            ],
        }).compile();

        service = module.get<RefreshTokenService>(RefreshTokenService);
        prisma = module.get(PrismaService);
        jwt = module.get(JwtService);
        token = module.get(TokenService);
    });

    afterEach(() => jest.clearAllMocks());

    //  createRefreshToken Test Suite 
    describe('createRefreshToken', () => {
        it('should create a refresh token and return the raw token', async () => {
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord);

            const result = await service.createRefreshToken('user-123');

            expect(prisma.token.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 'user-123',
                    type: 'REFRESH',
                    familyId: expect.any(String),
                }),
            });
            expect(result).toBe('raw-token-abc');
        });

        it('should reuse the provided familyId when given', async () => {
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord);

            await service.createRefreshToken('user-123', 'existing-family-id');

            expect(prisma.token.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    familyId: 'existing-family-id',
                }),
            });
        });

        it('should generate a new familyId when none is provided', async () => {
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord as any);

            await service.createRefreshToken('user-123');

            const callArg = (prisma.token.create as jest.Mock).mock.calls[0][0];
            expect(callArg.data.familyId).toBeDefined();
            expect(typeof callArg.data.familyId).toBe('string');
        });
    });

    //  refresh Test Suite

    describe('refresh', () => {
        it('should return new accessToken and refreshToken on valid token', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord as any);
            (prisma.token.update as jest.Mock).mockResolvedValue({ ...mockTokenRecord, usedAt: new Date() });
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord);

            const result = await service.refresh('raw-token');

            expect(result).toEqual({
                accessToken: 'signed-jwt-token',
                refreshToken: 'raw-token-abc',
            });
        });

        it('should sign JWT with correct payload', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord as any);
            (prisma.token.update as jest.Mock).mockResolvedValue({ ...mockTokenRecord, usedAt: new Date() });
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord);

            await service.refresh('raw-token');

            expect(jwt.sign).toHaveBeenCalledWith({
                userId: 'user-123',
                role: 'CONSULTANT',
            });
        });

        it('should mark the old token as used on successful refresh', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord);
            (prisma.token.update as jest.Mock).mockResolvedValue({ ...mockTokenRecord, usedAt: new Date() });
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord);

            await service.refresh('raw-token');

            expect((prisma.token.update as jest.Mock)).toHaveBeenCalledWith({
                where: { id: 'token-123' },
                data: { usedAt: expect.any(Date) },
            });
        });

        it('should throw 401 when token is not found', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue(null);

            await expect(service.refresh('invalid-token')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw 401 when token is expired', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord);
            token.isTokenExpired.mockReturnValue(true); // override to simulate expiry

            await expect(service.refresh('raw-token')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        //  Replay attack detection 

        it('should throw 401 when token has already been used (replay attack)', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue({
                ...mockTokenRecord,
                usedAt: new Date(), // already used
            } as any);

            await expect(service.refresh('raw-token')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should revoke entire token family when replay is detected', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue({
                ...mockTokenRecord,
                usedAt: new Date(),
            } as any);
            (prisma.token.updateMany as jest.Mock).mockResolvedValue({ count: 2 } as any);

            await expect(service.refresh('raw-token')).rejects.toThrow(
                'Refresh token reuse detected. Please log in again.',
            );

            expect((prisma.token.updateMany as jest.Mock)).toHaveBeenCalledWith({
                where: {
                    familyId: 'family-abc',
                    type: 'REFRESH',
                },
                data: { usedAt: expect.any(Date) },
            });
        });

        it('should issue new refresh token in same family after rotation', async () => {
            (prisma.token.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord as any);
            (prisma.token.update as jest.Mock).mockResolvedValue(mockTokenRecord as any);
            (prisma.token.create as jest.Mock).mockResolvedValue(mockTokenRecord as any);

            await service.refresh('raw-token');

            expect((prisma.token.create as jest.Mock)).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    familyId: 'family-abc', // same family preserved
                    type: 'REFRESH',
                }),
            });
        });
    });

    //  revokeAllForUser Test Suite

    describe('revokeAllForUser', () => {
        it('should revoke all active refresh tokens for a user', async () => {
            (prisma.token.updateMany as jest.Mock).mockResolvedValue({ count: 3 } as any);

            await service.revokeAllForUser('user-123');

            expect((prisma.token.updateMany as jest.Mock)).toHaveBeenCalledWith({
                where: {
                    userId: 'user-123',
                    type: 'REFRESH',
                    usedAt: null,
                },
                data: { usedAt: expect.any(Date) },
            });
        });

        it('should not throw if user has no active tokens', async () => {
            (prisma.token.updateMany as jest.Mock).mockResolvedValue({ count: 0 } as any);

            await expect(service.revokeAllForUser('user-123')).resolves.not.toThrow();
        });
    });
});