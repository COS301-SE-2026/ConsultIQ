import { Test, TestingModule } from '@nestjs/testing';
import { PlacerService, FreeGap } from './placer.service';
import { TimeService, LocalDate, Instant } from './time.service';
import { Task, Slot, AllocationSummary, WeekContainer } from '../dto/scheduler.dto';

describe('PlacerService', () => {
    let service: PlacerService;
    let timeService: jest.Mocked<TimeService>;

    let week: WeekContainer;
    const window = { start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' };

    beforeEach(async () => {
        const mockTimeService = {
            workingWindows: jest.fn(),
            localDate: jest.fn(),
            isInCoreHours: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlacerService,
                { provide: TimeService, useValue: mockTimeService },
            ],
        }).compile();

        service = module.get(PlacerService);
        timeService = module.get(TimeService);

        // --- Standardized Fresh Setup for ALL Tiers ---
        week = {
            id: 'w1',
            blocks: [],
            slots: [],
            calendarEntries: [],
            holidays: [],
            tasks: [],
            weekStart: '2026-09-21',
            timezone: 'Africa/Johannesburg'
        } as any;

        timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);

        // Ensure spies (like freeGaps mock) are cleared between every test
        jest.restoreAllMocks();
    });

    describe('Tier 1: freeGaps', () => {
        beforeEach(() => {
            // Only add Tier-1 specific overrides here
            week.blocks.push({ id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 600, start: '2026-09-21T06:00:00Z', end: '2026-09-25T14:00:00Z' } as any);
            timeService.workingWindows.mockReturnValue([
                { start: '2026-09-21T06:00:00Z', end: '2026-09-21T14:00:00Z' },
                { start: '2026-09-22T06:00:00Z', end: '2026-09-22T14:00:00Z' },
            ]);
        });

        it('should return available core hours restricted by fluid blocks and fillTarget', () => {
            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 1.0 });

            expect(gaps).toHaveLength(2);
            expect(gaps[0]).toEqual({ start: '2026-09-21T06:00:00Z', end: '2026-09-21T14:00:00Z', blockId: 'b1' });
            expect(gaps[1]).toEqual({ start: '2026-09-22T06:00:00Z', end: '2026-09-22T08:00:00Z', blockId: 'b1' });
        });

        it('should subtract calendar entries and sticky slots as obstacles', () => {
            week.calendarEntries.push({ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any);
            week.slots.push({ blockId: 'b1', start: '2026-09-21T12:00:00Z', end: '2026-09-21T13:00:00Z' } as any);

            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 1.0 });

            expect(gaps).toContainEqual({ start: '2026-09-21T06:00:00Z', end: '2026-09-21T08:00:00Z', blockId: 'b1' });
            expect(gaps).toContainEqual({ start: '2026-09-21T10:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' });
            expect(gaps).toContainEqual({ start: '2026-09-21T13:00:00Z', end: '2026-09-21T14:00:00Z', blockId: 'b1' });
        });

        it('should exclude days that are public holidays', () => {
            week.holidays.push({ date: '2026-09-21' } as any);

            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 1.0 });

            expect(gaps.some(g => g.start.startsWith('2026-09-21'))).toBe(false);
            expect(gaps[0].start).toBe('2026-09-22T06:00:00Z');
        });

        it('should leave default buffer unfilled (0.85)', () => {
            const gaps = service.freeGaps(week, 'p1', window);

            const totalMins = gaps.reduce((sum, g) => sum + service.intervalMinutes(g), 0);
            expect(totalMins).toBe(510);
        });
    });

    describe('Tier 0 Primitives', () => {
        describe('1. roundUp', () => {
            it('should round up to the nearest multiple of the unit', () => {
                expect(service.roundUp(10, 15)).toBe(15);
                expect(service.roundUp(16, 15)).toBe(30);
            });
        });

        describe('2. remainingMinutes', () => {
            it('should subtract covered minutes from tMax', () => {
                const task = { tMax: 120 } as Task;
                const stickySlots = [{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as Slot];
                expect(service.remainingMinutes(task, stickySlots)).toBe(60);
            });
        });

        describe('3. clipToDeadline', () => {
            const baseGap: FreeGap = { start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' };
            it('should trim gap end to deadline if gap extends past deadline', () => {
                const deadline = '2026-09-21T10:00:00Z' as Instant;
                const clipped = service.clipToDeadline(baseGap, deadline);
                expect(clipped.end).toBe(deadline);
            });
        });

        describe('4. intervalMinutes', () => {
            it('should calculate correct duration in minutes', () => {
                expect(service.intervalMinutes({ start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:30:00Z' })).toBe(90);
            });
        });

        describe('5. makeSlot', () => {
            it('should construct a valid Slot object', () => {
                const gap: FreeGap = { start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' };
                const slot = service.makeSlot({ id: 't1', weekId: 'w1' } as Task, gap, 90);
                expect(slot.end).toBe('2026-09-21T09:30:00Z');
                expect(slot.taskIds).toEqual(['t1']);
            });
        });

        describe('6. withDaySpanLabels', () => {
            it('should group by task and assign chronologic daySpan labels', () => {
                const slots = [
                    { id: 's1', kind: 'task', taskIds: ['t1'], start: '2026-09-22T08:00:00Z' } as Slot,
                    { id: 's2', kind: 'task', taskIds: ['t1'], start: '2026-09-21T08:00:00Z' } as Slot,
                ];
                const labeled = service.withDaySpanLabels(slots);
                expect(labeled.find(s => s.id === 's2')?.daySpan).toBe(1);
                expect(labeled.find(s => s.id === 's1')?.daySpan).toBe(2);
            });
        });

        describe('7. priorityScore', () => {
            it('should calculate priority based on urgency, complexity, and deadline', () => {
                const task = { urgency: 2, complexity: 3, deadline: '2026-09-21T10:00:00Z' } as Task;
                expect(service.priorityScore(task, '2026-09-21T08:00:00Z' as Instant)).toBe(5.5);
            });
        });

        describe('8. blockMinutes', () => {
            it('should return minutes based on percentage allocation', () => {
                expect(service.blockMinutes({ allocation: 40 } as AllocationSummary)).toBe(960);
            });
        });
    });

    describe('Tier 2: diagnose', () => {
        it('should diagnose DAY_SPAN_LIMIT if it fits when maxDays is ignored', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' },
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' },
                { start: '2026-09-23T08:00:00Z', end: '2026-09-23T10:00:00Z', blockId: 'b1' },
                { start: '2026-09-24T08:00:00Z', end: '2026-09-24T10:00:00Z', blockId: 'b1' },
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 480, deadline: '2026-09-25T00:00:00Z' } as Task;
            const summary = service.diagnose(week, task, window);

            expect(summary.reason).toBe('DAY_SPAN_LIMIT');
            expect(summary.neededMinutes).toBe(480);
            expect(summary.availableMinutes).toBe(480);
        });

        it('should diagnose DEADLINE_INFEASIBLE if it only fits by ignoring the deadline', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' },
                { start: '2026-09-24T08:00:00Z', end: '2026-09-24T12:00:00Z', blockId: 'b1' },
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 300, deadline: '2026-09-22T00:00:00Z' } as Task;
            const summary = service.diagnose(week, task, window);

            expect(summary.reason).toBe('DEADLINE_INFEASIBLE');
            expect(summary.deadline).toBe('2026-09-22T00:00:00Z');
        });

        it('should diagnose CONTAINER_FULL if it strictly does not fit at all', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' },
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 300 } as Task;
            const summary = service.diagnose(week, task, window);

            expect(summary.reason).toBe('CONTAINER_FULL');
            expect(summary.availableMinutes).toBe(60);
            expect(summary.neededMinutes).toBe(300);
        });
    });

    describe('Tier 2: batchMicroTasks', () => {
        it('should separate normal tasks into the remaining array', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 120 } as Task,
                { id: 't2', projectId: 'p1', tMax: 30 } as Task,
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.remaining.some(t => t.id === 't1')).toBe(true);
            expect(result.remaining.some(t => t.id === 't2')).toBe(true);
        });

        it('should batch multiple micro tasks into a single rounded slot', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' }
            ]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't2', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't3', projectId: 'p1', tMax: 10, urgency: 1, complexity: 1 } as Task,
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.remaining).toHaveLength(0);
            expect(result.batched).toHaveLength(1);

            const batchSlot = result.batched[0];
            expect(batchSlot.kind).toBe('batch');
            expect(batchSlot.taskIds).toEqual(['t1', 't2', 't3']);
            expect(service.intervalMinutes(batchSlot)).toBe(60);
            expect(batchSlot.blockId).toBe('b1');
        });

        it('should overflow to the next day if a batch exceeds the days gap capacity', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' },
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T09:00:00Z', blockId: 'b1' },
            ]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't2', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't3', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't4', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.remaining).toHaveLength(0);
            expect(result.batched).toHaveLength(2);

            const monBatch = result.batched.find(b => b.start.startsWith('2026-09-21'));
            const tueBatch = result.batched.find(b => b.start.startsWith('2026-09-22'));

            expect(monBatch?.taskIds).toEqual(['t1', 't2', 't3']);
            expect(tueBatch?.taskIds).toEqual(['t4']);
            expect(service.intervalMinutes(monBatch!)).toBe(60);
            expect(service.intervalMinutes(tueBatch!)).toBe(60);
        });

        it('should prioritize deadlines over standard priority score', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' }
            ]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 40, urgency: 5, complexity: 5 } as Task,
                { id: 't2', projectId: 'p1', tMax: 40, urgency: 1, complexity: 1, deadline: '2026-09-22T00:00:00Z' } as Task,
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.batched[0].taskIds).toEqual(['t2']);
            expect(result.remaining[0].id).toBe('t1');
        });
    });

    describe('Tier 3: placeTask & tryBump', () => {
        it('should successfully place a task, fragmenting it within constraints', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' },
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' },
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 180 } as Task;
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data).toHaveLength(2);
                expect(service.intervalMinutes(result.data[0])).toBe(120);
                expect(service.intervalMinutes(result.data[1])).toBe(60);
            }
        });

        it('should shrink a fragment to leave exactly MIN_BLOCK_MINUTES for the next day', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:30:00Z', blockId: 'b1' },
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' },
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 120 } as Task;
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(service.intervalMinutes(result.data[0])).toBe(60);
                expect(service.intervalMinutes(result.data[1])).toBe(60);
            }
        });

        it('should fail and return diagnosis if it exceeds max days spanned (3)', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' },
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T09:00:00Z', blockId: 'b1' },
                { start: '2026-09-23T08:00:00Z', end: '2026-09-23T09:00:00Z', blockId: 'b1' },
                { start: '2026-09-24T08:00:00Z', end: '2026-09-24T09:00:00Z', blockId: 'b1' },
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 240 } as Task;
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.summary.reason).toBe('DAY_SPAN_LIMIT');
            }
        });

        it('tryBump should successfully bump a lower priority task, replace it, and return attacker slots', () => {
            const victim = { id: 'victim', urgency: 1, complexity: 1, placement: 'placed', tMax: 120 } as Task;
            week.tasks.push(victim);
            week.slots.push({
                id: 'vs1', kind: 'task', taskIds: ['victim'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z'
            } as any);

            const attacker = { id: 'attacker', projectId: 'p1', tMax: 120, urgency: 5, complexity: 5 } as Task;

            jest.spyOn(service, 'freeGaps')
                .mockReturnValueOnce([{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }])
                .mockReturnValueOnce([{ start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' }]);

            const result = service.tryBump(week, attacker, window);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data[0].taskIds).toEqual(['attacker']);
                expect(result.data[0].start).toBe('2026-09-21T08:00:00Z');

                const victimSlot = week.slots.find(s => s.taskIds?.includes('victim'));
                expect(victimSlot?.start).toBe('2026-09-22T08:00:00Z');
                expect(week.tasks.find(t => t.id === 'victim')?.placement).toBe('placed');
            }
        });

        it('tryBump should rollback everything and fail if displaced task cannot be re-placed', () => {
            const victim = { id: 'victim', urgency: 1, complexity: 1, placement: 'placed', tMax: 120 } as Task;
            week.tasks.push(victim);
            week.slots.push({
                id: 'vs1', kind: 'task', taskIds: ['victim'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z'
            } as any);

            const attacker = { id: 'attacker', projectId: 'p1', tMax: 120, urgency: 5, complexity: 5 } as Task;

            jest.spyOn(service, 'freeGaps')
                .mockReturnValueOnce([{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }])
                .mockReturnValueOnce([]);

            const result = service.tryBump(week, attacker, window);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe('DISPLACED_TASK_UNPLACEABLE');
            }

            const restoredVictimSlot = week.slots.find(s => s.taskIds?.includes('victim'));
            expect(restoredVictimSlot?.start).toBe('2026-09-21T08:00:00Z');
            expect(week.tasks.find(t => t.id === 'victim')?.placement).toBe('placed');
        });
    });

    describe('Tier 4: place', () => {
        it('should ignore frozen tasks (InProgress, Done, Locked slots) and fully sticky tasks', () => {
            const frozenTask1 = { id: 't1', status: 'InProgress', tMax: 120 } as Task;
            const frozenTask2 = { id: 't2', status: 'Ready', tMax: 120 } as Task;
            const stickyTask = { id: 't3', status: 'Ready', tMax: 120 } as Task;

            week.tasks.push(frozenTask1, frozenTask2, stickyTask);

            week.slots.push({ id: 's1', taskIds: ['t2'], locked: true } as any);
            week.slots.push({ id: 's2', taskIds: ['t3'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any);

            const placeSpy = jest.spyOn(service, 'placeTask');

            const report = service.place(week, { window });

            expect(placeSpy).not.toHaveBeenCalled();
            expect(report.placed).toHaveLength(0);
            expect(report.unplaced).toHaveLength(0);
        });

        it('should batch micro tasks and place remaining tasks, returning a combined PlaceReport', () => {
            const microTask = { id: 'micro1', projectId: 'p1', status: 'Ready', tMax: 30 } as Task;
            const normalTask = { id: 'normal1', projectId: 'p1', status: 'Ready', tMax: 120, urgency: 1, complexity: 1 } as Task;

            week.tasks.push(microTask, normalTask);

            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' }
            ]);

            const report = service.place(week, { window });

            expect(report.placed).toContain('micro1');
            expect(week.tasks.find(t => t.id === 'micro1')?.placement).toBe('placed');

            expect(report.placed).toContain('normal1');
            expect(week.tasks.find(t => t.id === 'normal1')?.placement).toBe('placed');

            expect(week.slots).toHaveLength(2);
        });

        it('should sort remaining tasks by deadline first, then priority score', () => {
            week.blocks.push({ id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 120, start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' } as any);

            const t1 = { id: 't1', status: 'Ready', tMax: 60, urgency: 5, complexity: 5, projectId: 'p1' } as Task;
            const t2 = { id: 't2', status: 'Ready', tMax: 60, urgency: 1, complexity: 1, projectId: 'p1', deadline: '2026-09-22T00:00:00Z' } as Task;

            week.tasks.push(t1, t2);

            timeService.workingWindows.mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' }
            ]);

            const report = service.place(week, { window });

            expect(report.placed).toContain('t2');
            expect(report.unplaced).toHaveLength(1);
            expect(report.unplaced[0].taskId).toBe('t1');

            expect(week.tasks.find(t => t.id === 't2')?.placement).toBe('placed');
            expect(week.tasks.find(t => t.id === 't1')?.placement).toBe('unplaced');
            expect(week.tasks.find(t => t.id === 't1')?.unplacedReason).toBeDefined();
        });
    });

    describe('Tier 5: Edge Cases & Uncovered Branches', () => {
        it('freeGaps should return empty array if no block exists for the project', () => {
            const gaps = service.freeGaps(week, 'NON_EXISTENT_PROJECT', window);
            expect(gaps).toHaveLength(0);
        });

        it('freeGaps should break early if fillTarget capacity is reached exactly mid-gap', () => {

            week.blocks.push({ id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 100, start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' } as any);

            timeService.workingWindows.mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } // 120 mins
            ]);

            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 0.5 });


            expect(gaps).toHaveLength(1);
            expect(service.intervalMinutes(gaps[0])).toBe(50);
            expect(gaps[0].end).toBe('2026-09-21T08:50:00Z');
        });

        it('placeTask should skip gaps that are smaller than MIN_BLOCK_MINUTES', () => {

            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T08:10:00Z', blockId: 'b1' }
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 60 } as Task;
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.summary.reason).toBe('CONTAINER_FULL');
            }
        });

        it('tryBump should completely rollback if attacker STILL cannot fit after removing victim', () => {
            const victim = { id: 'victim', urgency: 1, complexity: 1, placement: 'placed', tMax: 60 } as Task;
            week.tasks.push(victim);
            week.slots.push({
                id: 'vs1', kind: 'task', taskIds: ['victim'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z'
            } as any);

            const attacker = { id: 'attacker', projectId: 'p1', tMax: 240, urgency: 5, complexity: 5 } as Task;

            jest.spyOn(service, 'freeGaps').mockReturnValue([]);

            const result = service.tryBump(week, attacker, window);

            expect(result.ok).toBe(false);

            expect(week.slots.find(s => s.taskIds?.includes('victim'))).toBeDefined();
            expect(week.tasks.find(t => t.id === 'victim')?.placement).toBe('placed');
        });
        it('place should execute tryBump when allowBump is true and standard placement fails', () => {
            week.blocks.push({ id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 120, start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' } as any);

            const victimTask = { id: 'victim', status: 'Ready', placement: 'placed', tMax: 60, urgency: 1, complexity: 1, projectId: 'p1' } as Task;
            week.tasks.push(victimTask);
            week.slots.push({ id: 'dummy_slot', kind: 'task', taskIds: ['victim'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as any);

            const highPriorityTask = { id: 't1', status: 'Ready', tMax: 120, urgency: 5, complexity: 5, projectId: 'p1' } as Task;
            week.tasks.push(highPriorityTask);

            timeService.workingWindows.mockReturnValue([{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' }]);

            jest.spyOn(service, 'freeGaps').mockReturnValue([]);
            const tryBumpSpy = jest.spyOn(service, 'tryBump').mockReturnValue({ ok: true, data: [] });

            const report = service.place(week, { window, allowBump: true });

            expect(tryBumpSpy).toHaveBeenCalledWith(week, highPriorityTask, window);
            expect(report.placed).toContain('t1');
        });

        it('place should fallback to unplaced with reason if tryBump also fails', () => {
            week.blocks.push({ id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 120, start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' } as any);

            const victimTask = { id: 'victim', status: 'Ready', placement: 'placed', tMax: 60, urgency: 1, complexity: 1, projectId: 'p1' } as Task;
            week.tasks.push(victimTask);
            week.slots.push({ id: 'dummy_slot', kind: 'task', taskIds: ['victim'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as any);

            const highPriorityTask = { id: 't1', status: 'Ready', tMax: 120, urgency: 5, complexity: 5, projectId: 'p1' } as Task;
            week.tasks.push(highPriorityTask);

            timeService.workingWindows.mockReturnValue([{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' }]);

            jest.spyOn(service, 'freeGaps').mockReturnValue([]);
            jest.spyOn(service, 'tryBump').mockReturnValue({ ok: false, code: 'NO_BUMPABLE_TASKS' } as any);

            const report = service.place(week, { window, allowBump: true });

            expect(report.unplaced).toHaveLength(1);
            expect(week.tasks.find(t => t.id === 't1')?.placement).toBe('unplaced');
            expect(week.tasks.find(t => t.id === 't1')?.unplacedReason).toBeDefined();
        });
    });
});