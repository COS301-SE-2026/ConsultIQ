import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';

const PAGES = [
    '/projects',
    '/consultants-manager',
    '/admin-dashboard',
    '/analytics-dashboard',
    '/admin-scoring-config',
    '/notifications',
    '/skill-gap',
    '/schedule',
    //  '/super-admin-dashboard',
];

for (const path of PAGES) {
    test(`accessibility (authenticated): ${path}`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();

        const critical = results.violations.filter(
            (v: Result) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (critical.length > 0) {
            console.log(`\n${critical.length} critical/serious violation(s) on ${path}:`);
            critical.forEach((v: Result) => {
                console.log(`  - [${v.impact}] ${v.id}: ${v.nodes.length} element(s) — ${v.help}`);
            });
        }

        expect(critical, `Critical/serious a11y violations on ${path}`).toEqual([]);
    });
}