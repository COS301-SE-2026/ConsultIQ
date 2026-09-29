import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/a11y',
    timeout: 15_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: true,
    reporter: [['html', { outputFolder: 'a11y-report', open: 'never' }], ['list']],

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],

    webServer: {
        command: 'npm run dev',
        cwd: './frontend',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
