import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/ui',
    timeout: 15_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: true,
    reporter: 'html',

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],

    webServer: {
        command: 'npm run dev',
        cwd: './frontend',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});