import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(__dirname, 'backend/.env.test') });

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,

    reporter: 'html',

    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },


    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: [
        {
            command: 'npm run start:dev',
            cwd: './backend',
            url: 'http://localhost:3000/',
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
            stdout: 'pipe',
            stderr: 'pipe',

            env: {
                DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://consultiq:consultiq@localhost:5432/consultiq_test',
                REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
                JWT_SECRET: process.env.JWT_SECRET ?? 'local-dev-secret-change-me',
            },
        },
        {
            command: 'npm run dev',
            cwd: './frontend',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
            stdout: 'pipe',
            stderr: 'pipe',
        },
    ],
});