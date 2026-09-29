import { test as setup, request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_FILE = path.resolve(__dirname, '../../.auth/user.json');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

setup('authenticate as project manager', async () => {
    const usersPath = path.resolve(__dirname, '../../backend/tests/load/test-users.json');
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const user = users.find((u: { role: string }) => u.role === 'PROJECT_MANAGER' || u.role === 'ADMIN');

    if (!user) {
        throw new Error('No PROJECT_MANAGER or ADMIN user found in test-users.json');
    }

    const apiContext = await request.newContext({ baseURL: API_BASE_URL });

    const loginRes = await apiContext.post('/auth/login', {
        data: { email: user.email, password: user.password },
    });

    if (!loginRes.ok()) {
        throw new Error(`Login failed: ${loginRes.status()} ${await loginRes.text()}`);
    }

    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await apiContext.storageState({ path: AUTH_FILE });
    await apiContext.dispose();
});