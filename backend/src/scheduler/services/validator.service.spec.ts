import { Test, TestingModule } from '@nestjs/testing';
import { ValidatorService } from './validator.service';
import { TimeService, LocalDate } from './time.service';
import { WeekContainer, ValidateContext, Task } from '../dto/scheduler.dto';
// import { SCHEDULER_RULES } from './scheduler-rules.constant';

describe('ValidatorService', () => {
    let validatorService: ValidatorService;
    let timeService: jest.Mocked<TimeService>;

    const createBaseWeek = (): WeekContainer => ({
        id: 'week-1',
        consultantId: 'c1',
        timezone: 'Africa/Johannesburg',
        weekStart: '2026-09-21',
        version: 1,
        lastCommittedAt: new Date().toISOString(),
        sourceOfLastChange: 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [],
        tasks: [],
        slots: [],
        calendarEntries: [],
        holidays: [],
        metadata: {
            available: 2400,
            allocated: 2400,
            scheduled: 0,
            buffer: 360,
            utilization: 0,
            softCapBreached: false,
            hardCapBreached: false,
            hasOutOfHours: false,
            hasWeekend: false,
            hasContainerOverflow: false,
        },
    });

    const createBaseContext = (previousWeek: WeekContainer): ValidateContext => ({
        previousWeek,
        bumpedEntityIds: [],
        allocations: [],
    });

    beforeEach(async () => {
        const mockTimeService = {
            isInCoreHours: jest.fn().mockReturnValue(true),
            localDate: jest.fn().mockReturnValue('2026-09-21' as LocalDate),
            workingWindows: jest.fn().mockReturnValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ValidatorService,
                { provide: TimeService, useValue: mockTimeService },
            ],
        }).compile();

        validatorService = module.get<ValidatorService>(ValidatorService);
        timeService = module.get(TimeService);
    });

    describe('Tier 0: Self-Contained Validators', () => {
        let week: WeekContainer;
        let context: ValidateContext;

        beforeEach(() => {
            week = createBaseWeek();
            context = createBaseContext(createBaseWeek());
        });

        it('#3 - should raise SOFT_CAP_BREACH warning if scheduled > 2400', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T17:00:00Z', taskIds: [] } as any); // 2460 mins
            const result = validatorService.validate(week, context);

            const issue = result.issues?.find(i => i.code === 'SOFT_CAP_BREACH');
            expect(issue).toBeDefined();
            expect(issue?.level).toBe('warning');
        });

        it('#6 - should raise FROZEN_ENTITY_MOVED if a locked slot properties change (task swapped)', () => {

            context.previousWeek!.slots.push({
                id: 's1', locked: true, start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1', taskIds: ['t1']
            } as any);

            week.slots.push({
                id: 's1', locked: true, start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z', blockId: 'b1', taskIds: ['t2']
            } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FROZEN_ENTITY_MOVED')?.entityIds).toContain('s1');
        });

        it('#6 - should raise FROZEN_ENTITY_MOVED if a frozen task is mutated unacceptably (Done -> Ready)', () => {

            context.previousWeek!.tasks.push({ id: 't1', status: 'Done', placement: 'placed' } as any);
            week.tasks.push({ id: 't1', status: 'Ready', placement: 'placed' } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FROZEN_ENTITY_MOVED')?.entityIds).toContain('t1');
        });

        it('#6 - should raise FROZEN_ENTITY_MOVED if a calendar entry is moved', () => {
            context.previousWeek!.calendarEntries.push({ id: 'ce1', start: '2026-09-21T10:00:00Z', end: '2026-09-21T11:00:00Z' } as any);
            week.calendarEntries.push({ id: 'ce1', start: '2026-09-21T11:00:00Z', end: '2026-09-21T12:00:00Z' } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FROZEN_ENTITY_MOVED')?.entityIds).toContain('ce1');
        });

        it('#6 - should raise FROZEN_ENTITY_MOVED if frozen entities are deleted entirely (testing optional chaining)', () => {

            context.previousWeek!.slots.push({ id: 's1', locked: true, start: '1', end: '2' } as any);
            context.previousWeek!.tasks.push({ id: 't1', status: 'InProgress', placement: 'placed' } as any);
            context.previousWeek!.calendarEntries.push({ id: 'ce1', start: '1', end: '2' } as any);
            const result = validatorService.validate(week, context);

            const movedIssues = result.issues?.filter(i => i.code === 'FROZEN_ENTITY_MOVED') || [];
            const movedIds = movedIssues.flatMap(i => i.entityIds || []);

            expect(movedIds).toContain('s1');
            expect(movedIds).toContain('t1');
            expect(movedIds).toContain('ce1');
        });

        it('#4 - should PASS at exactly the hard cap (2700 mins)', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:00:00Z', taskIds: [] } as any); // 2700 mins
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'HARD_CAP_BREACH')).toBeUndefined();
        });

        it('#4 - should FAIL strictly above the hard cap (2701 mins)', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:01:00Z', taskIds: [] } as any); // 2701 mins

            week.tasks.push(
                { id: 'high-priority', urgency: 5, complexity: 5, placement: 'placed' } as Task,
                { id: 'low-priority', urgency: 1, complexity: 1, placement: 'placed' } as Task,
                { id: 'med-priority', urgency: 2, complexity: 3, placement: 'placed' } as Task,
            );

            const result = validatorService.validate(week, context);
            const issue = result.issues?.find(i => i.code === 'HARD_CAP_BREACH');

            expect(issue).toBeDefined();
            expect(issue?.level).toBe('violation');
            expect(issue?.entityIds).toEqual(['low-priority', 'med-priority', 'high-priority']);
        });

        it('#6 - should bypass all frozen checks on the first commit of a week (no previousWeek)', () => {
            context.previousWeek = undefined;
            week.blocks.push({ id: 'b1', mobility: 'pinned', start: 'new-time' } as any);
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FROZEN_ENTITY_MOVED')).toBeUndefined();
        });

        it('#6 - should raise FROZEN_ENTITY_MOVED if pinned block changes', () => {
            context.previousWeek!.blocks.push({ id: 'b1', mobility: 'pinned', start: '2026-09-21T08:00:00Z', end: '2026-09-21T09:00:00Z' } as any);
            week.blocks.push({ id: 'b1', mobility: 'pinned', start: '2026-09-21T09:00:00Z', end: '2026-09-21T10:00:00Z' } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FROZEN_ENTITY_MOVED')?.entityIds).toContain('b1');
        });

        it('#6 - should allow InProgress to transition to Done', () => {
            context.previousWeek!.tasks.push({ id: 't1', status: 'InProgress', placement: 'placed' } as any);
            week.tasks.push({ id: 't1', status: 'Done', placement: 'placed' } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FROZEN_ENTITY_MOVED')).toBeUndefined();
        });

        it('#7 - should raise DEPENDENCY_ORDER violation if dependent starts before prerequisite finishes', () => {
            week.tasks.push({ id: 'dep1', dependsOn: [], status: 'Ready' } as any);
            week.tasks.push({ id: 'task1', dependsOn: ['dep1'], status: 'Ready' } as any);

            week.slots.push({ id: 's1', taskIds: ['task1'], start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z' } as any);
            week.slots.push({ id: 's2', taskIds: ['dep1'], start: '2026-09-21T09:00:00Z', end: '2026-09-21T11:00:00Z' } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'DEPENDENCY_ORDER')?.entityIds).toEqual(['task1', 'dep1']);
        });

        it('#8 - should raise TASK_LARGER_THAN_CONTAINER if placed task tMax > project allocated', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 100 } as any);
            week.tasks.push({ id: 't1', projectId: 'p1', tMax: 120, placement: 'placed', status: 'Ready' } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'TASK_LARGER_THAN_CONTAINER')).toBeDefined();
        });

        it('#10 - should raise CONTAINER_OVERFLOW if project task sums > block allocation', () => {
            week.blocks.push({ projectId: 'p1', allocatedMinutes: 100 } as any);
            week.tasks.push(
                { id: 't1', projectId: 'p1', tMax: 60 } as any,
                { id: 't2', projectId: 'p1', tMax: 60 } as any
            );

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'CONTAINER_OVERFLOW')?.entityIds).toEqual(['t1', 't2']);
        });

        it('#11 - should raise UNPLACED_TASKS if any task is unplaced', () => {
            week.tasks.push({ id: 't1', placement: 'unplaced' } as any);
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'UNPLACED_TASKS')).toBeDefined();
        });

        it('#12 - should raise DEADLINE_INFEASIBLE for task failing deadline limit', () => {
            week.tasks.push({ id: 't1', placement: 'unplaced', unplacedReason: 'DEADLINE_INFEASIBLE' } as any);
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'DEADLINE_INFEASIBLE')).toBeDefined();
        });

        it('#14 - should raise INVALID_ENTRY_ORIGIN if holiday entry lacks DB match', () => {
            week.calendarEntries.push({ id: 'ce1', type: 'meeting', origin: 'public-holiday' as any, start: '2026-12-25T08:00:00Z' } as any);
            timeService.localDate.mockReturnValue('2026-12-25' as LocalDate);
            // week.holidays is empty

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'INVALID_ENTRY_ORIGIN')?.entityIds).toContain('ce1');
        });
    });

    describe('Tier 1: TimeService & Context Dependent Validators', () => {
        let week: WeekContainer;
        let context: ValidateContext;

        beforeEach(() => {
            week = createBaseWeek();
            context = createBaseContext(createBaseWeek());
        });

        it('#1 - should raise OUT_OF_HOURS_UNTAGGED for slots outside core hours without tags', () => {
            timeService.isInCoreHours.mockReturnValue(false);
            week.slots.push({ id: 's1', start: '2026-09-21T18:00:00Z', end: '2026-09-21T19:00:00Z', tags: [] } as any);

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'OUT_OF_HOURS_UNTAGGED')?.entityIds).toContain('s1');
        });

        it('#2 - should raise DAILY_MAX_EXCEEDED if slots AND entries sum > 480 mins on same day', () => {
            timeService.localDate.mockReturnValue('2026-09-21' as LocalDate);
            week.slots.push({ id: 's1', start: '2026-09-21T08:00:00Z', end: '2026-09-21T12:00:00Z', taskIds: [] } as any); // 240 mins
            week.calendarEntries.push({ id: 'ce1', start: '2026-09-21T13:00:00Z', end: '2026-09-21T18:00:00Z', tags: [] } as any); // 300 mins

            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'DAILY_MAX_EXCEEDED')?.entityIds).toEqual(['s1', 'ce1']);
        });

        it('#5 - should raise FRAGMENT_TOO_SMALL violation if slot < 60 mins', () => {
            week.slots.push({ id: 's1', kind: 'task', start: '2026-09-21T08:00:00Z', end: '2026-09-21T08:30:00Z', taskIds: [] } as any); // 30 mins
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'FRAGMENT_TOO_SMALL')?.entityIds).toContain('s1');
        });

        it('#9 - should raise DAY_SPAN_LIMIT_AT_RISK if task tMax exceeds theoretical limit', () => {
            week.tasks.push({ id: 't1', title: 'Giant Task', tMax: 1500 } as any);
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'DAY_SPAN_LIMIT_AT_RISK')?.entityIds).toContain('t1');
        });

        it('#13 - should raise CONTAINERS_EXCEED_CONTRACT if allocations > 2400', () => {
            context.allocations = [{ projectId: 'p1', allocation: 105, allocatedMinutes: 2520 }];
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'CONTAINERS_EXCEED_CONTRACT')).toBeDefined();
        });

        it('#13 - should not false-positive on fractional percentage rounding', () => {

            context.allocations = Array(7).fill({ allocation: 14.2857 });
            const result = validatorService.validate(week, context);
            expect(result.issues?.find(i => i.code === 'CONTAINERS_EXCEED_CONTRACT')).toBeUndefined();
        });
    });

    describe('summarize (WeekMetadata derivation)', () => {
        let week: WeekContainer;

        beforeEach(() => {
            week = createBaseWeek();
            timeService.workingWindows.mockReturnValue([
                { start: '2026-09-21T06:00:00Z', end: '2026-09-21T14:00:00Z' },
                { start: '2026-09-22T06:00:00Z', end: '2026-09-22T14:00:00Z' },
                { start: '2026-09-23T06:00:00Z', end: '2026-09-23T14:00:00Z' },
                { start: '2026-09-24T06:00:00Z', end: '2026-09-24T14:00:00Z' },
                { start: '2026-09-25T06:00:00Z', end: '2026-09-25T14:00:00Z' }
            ]);
            timeService.localDate.mockImplementation((iso: string) => iso.split('T')[0] as LocalDate);
            timeService.isInCoreHours.mockReturnValue(true);
        });

        it('should calculate standard available capacity (2400 minutes)', () => {
            const metadata = validatorService.summarize(week);
            expect(metadata.available).toBe(2400);
            expect(metadata.buffer).toBe(2400);
        });

        it('should completely remove a day from capacity if it is a public holiday', () => {
            week.holidays.push({ id: 'h1', date: '2026-09-24', name: 'Heritage Day', createdAt: '', updatedAt: '' });
            const metadata = validatorService.summarize(week);
            expect(metadata.available).toBe(1920);
        });

        it('should correctly subtract overlapping calendar entries (meetings)', () => {
            week.calendarEntries.push({
                id: 'ce1', type: 'meeting', origin: 'user', tags: [],
                start: '2026-09-21T08:00:00Z', end: '2026-09-21T10:00:00Z'
            } as any);
            const metadata = validatorService.summarize(week);
            expect(metadata.available).toBe(2280);
        });
    });

    describe('Tier 2: Orchestrator validate()', () => {
        let week: WeekContainer;
        let context: ValidateContext;

        beforeEach(() => {
            week = createBaseWeek();
            context = createBaseContext(createBaseWeek());
            timeService.workingWindows.mockReturnValue([]);
            timeService.localDate.mockReturnValue('2026-09-21' as LocalDate);
            timeService.isInCoreHours.mockReturnValue(true);
        });

        it('should return ok: true and the week data if no violations exist', () => {
            week.tasks.push({ id: 't1', placement: 'unplaced' } as any);

            const result = validatorService.validate(week, context);

            expect(result.ok).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.issues?.some(i => i.code === 'UNPLACED_TASKS')).toBe(true);
            expect(result.issues?.some(i => i.level === 'violation')).toBe(false);
        });

        it('should return ok: false and omit data if any violation exists', () => {
            week.slots.push({ id: 's1', start: '2026-09-21T00:00:00Z', end: '2026-09-22T21:01:00Z', taskIds: [] } as any); // Breaches hard cap
            const result = validatorService.validate(week, context);

            expect(result.ok).toBe(false);
            expect((result as any).data).toBeUndefined(); // Validates no mutation leaks
            expect(result.issues?.some(i => i.code === 'HARD_CAP_BREACH')).toBe(true);
        });
    });
});