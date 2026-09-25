import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolloverService } from './rollover.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeekService, CommitResult } from './week.service';
import { TimeService, LocalDate } from './time.service';
import { WeekContainer, Interval } from '../dto/scheduler.dto';

describe('RolloverService', () => {
    let service: RolloverService;
    let prisma: any;
    let weekService: jest.Mocked<WeekService>;

    const mockWeek: Partial<WeekContainer> = {
        id: 'week-1',
        consultantId: 'cons-1',
        timezone: 'Africa/Johannesburg',
        weekStart: '2026-09-21' as LocalDate,
    };

    const mockCommitResult: CommitResult = {
        ok: true,
        value: mockWeek as WeekContainer,
        violations: [],
        warnings: [],
        infos: [],
    };

    beforeEach(async () => {
        const prismaMock = {
            schedulerIdempotencyKey: {
                create: jest.fn(),
                deleteMany: jest.fn(),
            },

            schedulerSlot: {
                findUnique: jest.fn(),
                deleteMany: jest.fn(),
            },
            schedulerTask: {
                findMany: jest.fn(),
                update: jest.fn(),
            },
            schedulerWeek: {
                updateMany: jest.fn(),
            },

            $transaction: jest.fn(async (cb) => cb(prismaMock)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RolloverService,
                { provide: PrismaService, useValue: prismaMock },
                {
                    provide: WeekService,
                    useValue: {
                        getWeek: jest.fn().mockResolvedValue(mockWeek),
                        commit: jest.fn().mockResolvedValue(mockCommitResult),
                    },
                },
                {
                    provide: TimeService,
                    useValue: {
                        weekOf: jest.fn().mockReturnValue('2026-09-21'),
                        restOfDayWindow: jest.fn().mockReturnValue({
                            start: '2026-09-25T14:00:00Z',
                            end: '2026-09-28T00:00:00Z',
                        } as Interval),
                    },
                },
            ],
        }).compile();

        service = module.get(RolloverService);
        prisma = module.get(PrismaService);
        weekService = module.get(WeekService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('rollover', () => {
        it('throws ConflictException if operation is already processed (P2002)', async () => {

            const p2002Error = new Error('Unique constraint failed');
            (p2002Error as any).code = 'P2002';
            prisma.schedulerIdempotencyKey.create.mockRejectedValueOnce(p2002Error);

            await expect(service.rollover('task-1', 'slot-1')).rejects.toThrow(ConflictException);
            expect(weekService.commit).not.toHaveBeenCalled();
        });

        it('throws NotFoundException if the target slot does not exist', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValueOnce(null);

            await expect(service.rollover('task-1', 'slot-1')).rejects.toThrow(NotFoundException);
        });

        it('successfully dispatches a rollover change and retains idempotency lock on success', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValueOnce({
                id: 'slot-1',
                start: new Date('2026-09-25T14:00:00Z'),
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-21T00:00:00Z') },
            });

            const result = await service.rollover('task-1', 'slot-1');

            expect(result.ok).toBe(true);
            expect(prisma.schedulerIdempotencyKey.create).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ key: 'rollover:task-1:slot-1' }) })
            );
            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'rollover', taskId: 'task-1', fromSlotId: 'slot-1' }),
                expect.objectContaining({ bumpedEntityIds: [] }),
                undefined
            );
            expect(prisma.schedulerIdempotencyKey.deleteMany).not.toHaveBeenCalled();
        });

        it('releases idempotency lock if commit validation fails (ok: false)', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValueOnce({
                id: 'slot-1',
                start: new Date('2026-09-25T14:00:00Z'),
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-21T00:00:00Z') },
            });

            weekService.commit.mockResolvedValueOnce({ ...mockCommitResult, ok: false });

            await service.rollover('task-1', 'slot-1');

            expect(prisma.schedulerIdempotencyKey.deleteMany).toHaveBeenCalledWith({
                where: { key: 'rollover:task-1:slot-1' },
            });
        });

        it('releases idempotency lock if an unexpected error is thrown during commit', async () => {
            prisma.schedulerSlot.findUnique.mockResolvedValueOnce({
                id: 'slot-1',
                start: new Date('2026-09-25T14:00:00Z'),
                week: { consultantId: 'cons-1', weekStart: new Date('2026-09-21T00:00:00Z') },
            });

            weekService.commit.mockRejectedValueOnce(new Error('DB crash'));

            await expect(service.rollover('task-1', 'slot-1')).rejects.toThrow('DB crash');

            expect(prisma.schedulerIdempotencyKey.deleteMany).toHaveBeenCalledWith({
                where: { key: 'rollover:task-1:slot-1' },
            });
        });
    });

    describe('markIncomplete', () => {
        it('dispatches a mark_incomplete change and maps the return result', async () => {
            const result = await service.markIncomplete('cons-1', '2026-09-25' as LocalDate);

            expect(result.ok).toBe(true);

            expect(weekService.commit).toHaveBeenCalledWith(
                mockWeek,
                expect.objectContaining({ type: 'mark_incomplete', date: '2026-09-25' }),
                expect.any(Object),
                undefined
            );
        });

        it('releases lock and passes up the violation message if commit fails', async () => {
            weekService.commit.mockResolvedValueOnce({
                ...mockCommitResult,
                ok: false,
                violations: [{ level: 'violation', message: 'Target locked', code: 'TEST_CODE' as any }]
            });

            const result = await service.markIncomplete('cons-1', '2026-09-25' as LocalDate);

            expect(result.ok).toBe(false);
            expect(result.message).toBe('Target locked');

            expect(prisma.schedulerIdempotencyKey.deleteMany).toHaveBeenCalledWith({
                where: { key: 'mark_incomplete:cons-1:2026-09-25' },
            });
        });
    });

    describe('migrateWeek', () => {
        it('returns early if there are no incomplete tasks to migrate', async () => {
            prisma.schedulerTask.findMany.mockResolvedValueOnce([]);

            const result = await service.migrateWeek('week-A', 'week-B');

            expect(result.ok).toBe(true);

            expect(prisma.schedulerTask.update).not.toHaveBeenCalled();
            expect(prisma.schedulerWeek.updateMany).not.toHaveBeenCalled();
        });

        it('migrates incomplete tasks and version bumps both weeks', async () => {
            prisma.schedulerTask.findMany.mockResolvedValueOnce([
                { id: 'task-1' },
                { id: 'task-2' }
            ]);

            const result = await service.migrateWeek('week-A', 'week-B');

            expect(result.ok).toBe(true);
            expect(result.message).toContain('Migrated 2 task(s)');

            expect(prisma.schedulerTask.update).toHaveBeenCalledTimes(2);
            expect(prisma.schedulerTask.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'task-1' },
                    data: expect.objectContaining({ weekId: 'week-B', placement: 'unplaced' })
                })
            );

            expect(prisma.schedulerWeek.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: { in: ['week-A', 'week-B'] } },
                    data: expect.objectContaining({ version: { increment: 1 } })
                })
            );
        });
    });
});