export const SCHEDULER_RULES = {
    // General placement & fragmentation
    FRAGMENT_MAX_COUNT: 3,
    MIN_BLOCK_MINUTES: 60,
    MICRO_TASK_THRESHOLD: 15,
    BUFFER_TARGET_PERCENTAGE: 0.15,

    // Labor law & capacity limits (Configurable per region, defaults to ZA)
    DAILY_MAX_MINUTES: 480,          // 8 hours per day
    CONTRACT_SOFT_CAP_MINUTES: 2400, // 40 hours per week
    LEGAL_HARD_CAP_MINUTES: 2700,    // 45 hours per week (BCEA limit)
    HARD_CAP_INCLUSIVE: false,

    // Core hours tracking
    CORE_HOURS_START: '08:00',
    CORE_HOURS_END: '16:00',

    // System scheduling
    DAILY_TICK_TIME: '07:30',
    WEEKLY_TICK_DAY: 0,              // Sunday
    WEEKLY_TICK_TIME: '00:00'
} as const;