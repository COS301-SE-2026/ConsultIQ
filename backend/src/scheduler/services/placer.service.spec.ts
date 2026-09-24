import { Test, TestingModule } from '@nestjs/testing';
import { PlacerService, FreeGap } from './placer.service';
import { TimeService, LocalDate } from './time.service';
import { Task, Slot, AllocationSummary, WeekContainer } from '../dto/scheduler.dto';


describe('PlacerService', () => {
    let service: PlacerService;
    let timeService: jest.Mocked<TimeService>;

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

        service = module.get<PlacerService>(PlacerService);
        timeService = module.get(TimeService);
    });

    describe('Tier 1: freeGaps', () => {
        let week: WeekContainer;
        const window = { start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' };

        beforeEach(() => {
            week = {
                blocks: [
                    { id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 600, start: '2026-09-21T06:00:00Z', end: '2026-09-25T14:00:00Z' }
                ],
                slots: [],
                calendarEntries: [],
                holidays: [],
                weekStart: '2026-09-21',
                timezone: 'Africa/Johannesburg'
            } as any;

            // Mock working windows: Mon and Tue 06:00 to 14:00 (UTC)
            timeService.workingWindows.mockReturnValue([
                { start: '2026-09-21T06:00:00Z', end: '2026-09-21T14:00:00Z' },
                { start: '2026-09-22T06:00:00Z', end: '2026-09-22T14:00:00Z' },
            ]);
            timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);
        });

        it('should return available core hours restricted by fluid blocks and fillTarget', () => {
            // fillTarget of 1.0 (no buffer) means we want up to 600 mins.
            // 06:00 to 14:00 is 480 mins. Two days = 960 mins available.

            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 1.0 });

            expect(gaps.length).toBe(2);
            expect(gaps[0]).toEqual({ start: '2026-09-21T06:00:00Z', end: '2026-09-21T14:00:00Z', blockId: 'b1' }); // 480 mins
            expect(gaps[1]).toEqual({ start: '2026-09-22T06:00:00Z', end: '2026-09-22T08:00:00Z', blockId: 'b1' }); // 120 mins (Total 600)
        });

        it('should subtract calendar entries and sticky slots as obstacles', () => {
            // Meeting Monday 08:00-10:00 UTC
            week.calendarEntries.push({ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any);
            // Existing Slot Monday 12:00-13:00 UTC
            week.slots.push({ blockId: 'b1', start: '2026-09-21T12:00:00Z', end: '2026-09-21T13:00:00Z' } as any);

            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 1.0 });

            // Monday should be split: 06:00-08:00, 10:00-12:00, 13:00-14:00
            expect(gaps).toContainEqual({ start: '2026-09-21T06:00:00Z', end: '2026-09-21T08:00:00Z', blockId: 'b1' });
            expect(gaps).toContainEqual({ start: '2026-09-21T10:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' });
            expect(gaps).toContainEqual({ start: '2026-09-21T13:00:00Z', end: '2026-09-21T14:00:00Z', blockId: 'b1' });
        });

        it('should exclude days that are public holidays', () => {
            // Monday is a holiday
            week.holidays.push({ date: '2026-09-21' } as any);

            const gaps = service.freeGaps(week, 'p1', window, { fillTarget: 1.0 });

            // Monday is entirely missing, only Tuesday should remain
            expect(gaps.some(g => g.start.startsWith('2026-09-21'))).toBe(false);
            expect(gaps[0].start).toBe('2026-09-22T06:00:00Z');
        });

        it('should leave default buffer unfilled (0.85)', () => {
            // 0.85 * 600 allocated = 510 minutes allowed
            const gaps = service.freeGaps(week, 'p1', window);

            const totalMins = gaps.reduce((sum, g) => sum + service.intervalMinutes(g), 0);
            expect(totalMins).toBe(510);
        });
    });

    // --- Tier 0 Primitives tests remain unchanged below this point ---

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
                const deadline = '2026-09-21T10:00:00Z';
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
                const slot = service.makeSlot({ id: 't1', weekId: 'w1' } as Task, gap, 90, '2026-09-21');
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
                expect(service.priorityScore(task, '2026-09-21T08:00:00Z')).toBe(5.5);
            });
        });

        describe('8. blockMinutes', () => {
            it('should return minutes based on percentage allocation', () => {
                expect(service.blockMinutes({ allocation: 40 } as AllocationSummary)).toBe(960);
            });
        });
    });

    describe('Tier 2: diagnose', () => {
        let week: WeekContainer;
        const window = { start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' };

        beforeEach(() => {
            week = {
                blocks: [], slots: [], calendarEntries: [], holidays: [],
                weekStart: '2026-09-21', timezone: 'Africa/Johannesburg'
            } as any;

            timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);
        });

        it('should diagnose DAY_SPAN_LIMIT if it fits when maxDays is ignored', () => {
            // Mock freeGaps to return 4 small gaps across 4 distinct days
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }, // 120 mins
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' }, // 120 mins
                { start: '2026-09-23T08:00:00Z', end: '2026-09-23T10:00:00Z', blockId: 'b1' }, // 120 mins
                { start: '2026-09-24T08:00:00Z', end: '2026-09-24T10:00:00Z', blockId: 'b1' }, // 120 mins
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 480, deadline: '2026-09-25T00:00:00Z' } as Task;

            const summary = service.diagnose(week, task, window);

            expect(summary.reason).toBe('DAY_SPAN_LIMIT');
            expect(summary.neededMinutes).toBe(480);
            expect(summary.availableMinutes).toBe(480);
        });

        it('should diagnose DEADLINE_INFEASIBLE if it only fits by ignoring the deadline', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }, // 120 mins
                { start: '2026-09-24T08:00:00Z', end: '2026-09-24T12:00:00Z', blockId: 'b1' }, // 240 mins (past deadline)
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 300, deadline: '2026-09-22T00:00:00Z' } as Task;

            const summary = service.diagnose(week, task, window);

            // Before deadline: 120 mins. Total available: 360 mins. Needs: 300 mins.
            expect(summary.reason).toBe('DEADLINE_INFEASIBLE');
            expect(summary.deadline).toBe('2026-09-22T00:00:00Z');
        });

        it('should diagnose CONTAINER_FULL if it strictly does not fit at all', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' }, // 60 mins
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 300 } as Task;

            const summary = service.diagnose(week, task, window);

            expect(summary.reason).toBe('CONTAINER_FULL');
            expect(summary.availableMinutes).toBe(60);
            expect(summary.neededMinutes).toBe(300);
        });
    });

    describe('Tier 2: batchMicroTasks', () => {
        let week: WeekContainer;
        const window = { start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' };

        beforeEach(() => {
            week = {
                id: 'w1',
                blocks: [], slots: [], calendarEntries: [], holidays: [],
                weekStart: '2026-09-21', timezone: 'Africa/Johannesburg'
            } as any;

            timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);
        });

        it('should separate normal tasks into the remaining array', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 120 } as Task, // Normal task
                { id: 't2', projectId: 'p1', tMax: 30 } as Task,  // Micro task
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.remaining.some(t => t.id === 't1')).toBe(true);

            expect(result.remaining.some(t => t.id === 't2')).toBe(true);
        });

        it('should batch multiple micro tasks into a single rounded slot', () => {
            // Mock one large gap on Monday
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' } // 240 mins
            ]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't2', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't3', projectId: 'p1', tMax: 10, urgency: 1, complexity: 1 } as Task,
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.remaining.length).toBe(0);
            expect(result.batched.length).toBe(1);

            const batchSlot = result.batched[0];
            expect(batchSlot.kind).toBe('batch');
            expect(batchSlot.taskIds).toEqual(['t1', 't2', 't3']);
            expect(service.intervalMinutes(batchSlot)).toBe(60); // 50 mins rounded up
            expect(batchSlot.blockId).toBe('b1');
        });

        it('should overflow to the next day if a batch exceeds the days gap capacity', () => {
            // Mock two small 60 min gaps across two days
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' }, // Monday (60m)
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T09:00:00Z', blockId: 'b1' }, // Tuesday (60m)
            ]);

            // Total 80 mins. First 3 (60m) fit Monday. The 4th (20m) must wait for Tuesday.
            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't2', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't3', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task,
                { id: 't4', projectId: 'p1', tMax: 20, urgency: 1, complexity: 1 } as Task, // Breaks the 60m threshold
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            expect(result.remaining.length).toBe(0);
            expect(result.batched.length).toBe(2);

            const monBatch = result.batched.find(b => b.start.startsWith('2026-09-21'));
            const tueBatch = result.batched.find(b => b.start.startsWith('2026-09-22'));

            expect(monBatch?.taskIds).toEqual(['t1', 't2', 't3']);
            expect(tueBatch?.taskIds).toEqual(['t4']);
            expect(service.intervalMinutes(monBatch!)).toBe(60); // 60 rounded to 60
            expect(service.intervalMinutes(tueBatch!)).toBe(60); // 20 rounded to 60
        });

        it('should prioritize deadlines over standard priority score', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' } // Only room for one 60m batch
            ]);

            const tasks = [
                { id: 't1', projectId: 'p1', tMax: 40, urgency: 5, complexity: 5 } as Task, // High priority, no deadline
                { id: 't2', projectId: 'p1', tMax: 40, urgency: 1, complexity: 1, deadline: '2026-09-22T00:00:00Z' } as Task, // Low priority, has deadline
            ];

            const result = service.batchMicroTasks(week, tasks, window);

            // Since t2 has a deadline, it should be batched first. t1 overflows to remaining.
            expect(result.batched[0].taskIds).toEqual(['t2']);
            expect(result.remaining[0].id).toBe('t1');
        });
    });

    describe('Tier 3: placeTask & tryBump', () => {
        let week: WeekContainer;
        const window = { start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' };

        beforeEach(() => {
            week = {
                blocks: [], slots: [], calendarEntries: [], holidays: [], tasks: [],
                weekStart: '2026-09-21', timezone: 'Africa/Johannesburg'
            } as any;
            timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);
        });

        it('should successfully place a task, fragmenting it within constraints', () => {
            // Mock freeGaps to return two 120min gaps on Mon and Tue
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }, // 120
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' }, // 120
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 180 } as Task;
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data.length).toBe(2);
                expect(service.intervalMinutes(result.data[0])).toBe(120); // Takes all of Mon
                expect(service.intervalMinutes(result.data[1])).toBe(60);  // Takes 60 of Tue
            }
        });

        it('should shrink a fragment to leave exactly MIN_BLOCK_MINUTES for the next day', () => {
            // 90 min gap on Mon, 120 min gap on Tue
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:30:00Z', blockId: 'b1' }, // 90 mins
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' }, // 120 mins
            ]);

            // tMax = 120. Needs 120.
            // Gap 1: Min(90, 120) = 90. Left = 120 - 90 = 30.
            // Since 30 is less than 60, it shrinks Gap 1 by 30 so the remainder becomes exactly 60.
            const task = { id: 't1', projectId: 'p1', tMax: 120 } as Task;
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(service.intervalMinutes(result.data[0])).toBe(60); // Monday shrunk to 60
                expect(service.intervalMinutes(result.data[1])).toBe(60); // Tuesday takes the rest
            }
        });

        it('should fail and return diagnosis if it exceeds max days spanned (3)', () => {
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1' }, // Mon
                { start: '2026-09-22T08:00:00Z', end: '2026-09-22T09:00:00Z', blockId: 'b1' }, // Tue
                { start: '2026-09-23T08:00:00Z', end: '2026-09-23T09:00:00Z', blockId: 'b1' }, // Wed
                { start: '2026-09-24T08:00:00Z', end: '2026-09-24T09:00:00Z', blockId: 'b1' }, // Thu
            ]);

            const task = { id: 't1', projectId: 'p1', tMax: 240 } as Task; // Needs 4 days of 60 mins
            const result = service.placeTask(week, task, window, false);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                // Diagnosis identifies that it would fit if days spanned was infinite
                expect(result.summary.reason).toBe('DAY_SPAN_LIMIT');
            }
        });

        it('tryBump should successfully bump a lower priority task, replace it, and return attacker slots', () => {
            // Victim task (low priority)
            const victim = { id: 'victim', urgency: 1, complexity: 1, placement: 'placed', tMax: 120 } as Task;
            week.tasks.push(victim);
            week.slots.push({
                id: 'vs1', kind: 'task', taskIds: ['victim'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z'
            } as any);

            // Attacker task (high priority)
            const attacker = { id: 'attacker', projectId: 'p1', tMax: 120, urgency: 5, complexity: 5 } as Task;

            // When tryBump calls freeGaps for attacker, it will see the victim's slot is gone (120 min gap available)
            jest.spyOn(service, 'freeGaps')
                .mockReturnValueOnce([{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }]) // for attacker
                .mockReturnValueOnce([{ start: '2026-09-22T08:00:00Z', end: '2026-09-22T10:00:00Z', blockId: 'b1' }]); // for victim re-placement

            const result = service.tryBump(week, attacker, window);

            expect(result.ok).toBe(true);
            if (result.ok) {
                // Attacker gets the Monday slot
                expect(result.data[0].taskIds).toEqual(['attacker']);
                expect(result.data[0].start).toBe('2026-09-21T08:00:00Z');

                // Victim was successfully pushed to Tuesday in the mutated week
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

            // Attacker succeeds, but victim re-placement returns no gaps
            jest.spyOn(service, 'freeGaps')
                .mockReturnValueOnce([{ start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z', blockId: 'b1' }])
                .mockReturnValueOnce([]); // Victim fails

            const result = service.tryBump(week, attacker, window);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.code).toBe('DISPLACED_TASK_UNPLACEABLE');
            }

            // Snapshot rollback verification
            const restoredVictimSlot = week.slots.find(s => s.taskIds?.includes('victim'));
            expect(restoredVictimSlot?.start).toBe('2026-09-21T08:00:00Z');
            expect(week.tasks.find(t => t.id === 'victim')?.placement).toBe('placed');
        });
    });

    describe('Tier 4: place', () => {
        let week: WeekContainer;
        const window = { start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' };

        beforeEach(() => {
            week = {
                blocks: [], slots: [], calendarEntries: [], holidays: [], tasks: [],
                weekStart: '2026-09-21', timezone: 'Africa/Johannesburg'
            } as any;
            timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);
        });

        it('should ignore frozen tasks (InProgress, Done, Locked slots) and fully sticky tasks', () => {
            const frozenTask1 = { id: 't1', status: 'InProgress', tMax: 120 } as Task;
            const frozenTask2 = { id: 't2', status: 'Ready', tMax: 120 } as Task;
            const stickyTask = { id: 't3', status: 'Ready', tMax: 120 } as Task;

            week.tasks.push(frozenTask1, frozenTask2, stickyTask);

            // t2 is frozen because it has a locked slot
            week.slots.push({ id: 's1', taskIds: ['t2'], locked: true } as any);

            // t3 is fully sticky because its existing slot covers its tMax (120 mins)
            week.slots.push({ id: 's2', taskIds: ['t3'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any);

            // We spy on placeTask to ensure it's never called for any of these
            const placeSpy = jest.spyOn(service, 'placeTask');

            const report = service.place(week, { window });

            expect(placeSpy).not.toHaveBeenCalled();
            expect(report.placed.length).toBe(0);
            expect(report.unplaced.length).toBe(0);
        });

        it('should batch micro tasks and place remaining tasks, returning a combined PlaceReport', () => {
            // Micro task (30m) and Normal task (120m)
            const microTask = { id: 'micro1', projectId: 'p1', status: 'Ready', tMax: 30 } as Task;
            const normalTask = { id: 'normal1', projectId: 'p1', status: 'Ready', tMax: 120, urgency: 1, complexity: 1 } as Task;

            week.tasks.push(microTask, normalTask);

            // Mock freeGaps to provide a single large gap to fulfill everything
            jest.spyOn(service, 'freeGaps').mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', blockId: 'b1' } // 240 mins
            ]);

            const report = service.place(week, { window });

            // Micro task should be batched
            expect(report.placed).toContain('micro1');
            expect(week.tasks.find(t => t.id === 'micro1')?.placement).toBe('placed');

            // Normal task should be individually placed
            expect(report.placed).toContain('normal1');
            expect(week.tasks.find(t => t.id === 'normal1')?.placement).toBe('placed');

            // 1 Batch slot + 1 Normal slot = 2 slots total
            expect(week.slots.length).toBe(2);
        });

        it('should sort remaining tasks by deadline first, then priority score', () => {
            // Change allocatedMinutes to 120
            week.blocks.push({ id: 'b1', projectId: 'p1', mobility: 'fluid', allocatedMinutes: 120, start: '2026-09-21T00:00:00Z', end: '2026-09-25T23:59:59Z' } as any);

            const t1 = { id: 't1', status: 'Ready', tMax: 60, urgency: 5, complexity: 5, projectId: 'p1' } as Task;
            const t2 = { id: 't2', status: 'Ready', tMax: 60, urgency: 1, complexity: 1, projectId: 'p1', deadline: '2026-09-22T00:00:00Z' } as Task;

            week.tasks.push(t1, t2);

            // Expand the working window to 2 hours (120 mins) to match the block allocation
            timeService.workingWindows.mockReturnValue([
                { start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' }
            ]);

            // Clear the freeGaps mock from the previous tests so real obstacle-subtraction runs
            if ((service.freeGaps as any).mockRestore) {
                (service.freeGaps as any).mockRestore();
            }

            const report = service.place(week, { window });

            // t2 should win because deadline trumps priority score. It gets placed, t1 fails.
            expect(report.placed).toContain('t2');
            expect(report.unplaced.length).toBe(1);
            expect(report.unplaced[0].taskId).toBe('t1');

            // Verify task statuses were updated
            expect(week.tasks.find(t => t.id === 't2')?.placement).toBe('placed');
            expect(week.tasks.find(t => t.id === 't1')?.placement).toBe('unplaced');
            expect(week.tasks.find(t => t.id === 't1')?.unplacedReason).toBeDefined();
        });
    });
});