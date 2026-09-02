import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';


dotenv.config({ path: path.resolve(__dirname, 'backend/.env.test') });

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required env var "${name}" for e2e tests. `
        );
    }
    return value;
}

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
                DATABASE_URL: requireEnv('DATABASE_URL'),
                REDIS_URL: requireEnv('REDIS_URL'),
                JWT_SECRET: requireEnv('JWT_SECRET'),
                RESEND_API_KEY: requireEnv('RESEND_API_KEY'),
                AWS_REGION: requireEnv('AWS_REGION'),
                AWS_S3_BUCKET: requireEnv('AWS_S3_BUCKET'),
                AWS_ACCESS_KEY_ID: requireEnv('AWS_ACCESS_KEY_ID'),
                AWS_SECRET_ACCESS_KEY: requireEnv('AWS_SECRET_ACCESS_KEY'),
                ANTHROPIC_API_KEY: requireEnv('ANTHROPIC_API_KEY'),
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