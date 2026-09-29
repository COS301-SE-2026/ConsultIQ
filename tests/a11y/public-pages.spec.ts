import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';

const PAGES = ['/', '/login'];

for (const path of PAGES) {
    test(`accessibility: ${path}`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();

        const critical = results.violations.filter(
            (v: Result) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (critical.length > 0) {
            console.log(JSON.stringify(critical, null, 2));
        }

        expect(critical, `Critical/serious a11y violations on ${path}`).toEqual([]);
    });
}
