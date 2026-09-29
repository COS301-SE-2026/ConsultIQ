module.exports = {
    ci: {
        collect: {
            url: [
                'http://localhost:4173/',
                'http://localhost:4173/login',
            ],
            numberOfRuns: 2,
            startServerCommand: 'npm run preview -- --port 4173',
            startServerReadyPattern: 'Local',
            settings: {
                onlyCategories: ['accessibility'],
                throttlingMethod: 'provided',
                chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless=new --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --disable-ipc-flooding-protection'
            }
        },
        assert: {
            assertions: {
                'categories:accessibility': ['error', { minScore: 0.9 }],
                'color-contrast': 'error',
                'image-alt': 'error',
                'label': 'error',
                'button-name': 'error',
                'html-has-lang': 'error'
            }
        },
        upload: { target: 'filesystem', outputDir: './lhci-reports/public' }
    }
};