describe('auth CORS policy', () => {
    const originalEnv = process.env;

    async function loadCors(overrides: NodeJS.ProcessEnv) {
        jest.resetModules();
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            FRONTEND_BASE_URL: 'https://app.example.com',
            FRONTEND_ORIGINS: 'https://app.example.com',
            ...overrides,
        };

        return import('../../src/config/cors');
    }

    afterEach(() => {
        process.env = originalEnv;
        jest.resetModules();
    });

    it('allows configured production origins', async () => {
        const { isCorsOriginAllowed } = await loadCors({});

        expect(isCorsOriginAllowed('https://app.example.com')).toBe(true);
    });

    it('rejects unconfigured production origins', async () => {
        const { isCorsOriginAllowed } = await loadCors({});

        expect(isCorsOriginAllowed('https://evil.example.com')).toBe(false);
    });
});
