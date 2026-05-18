import request from 'supertest';

describe('Auth routes', () => {
    afterEach(() => {
        jest.resetModules();
        jest.restoreAllMocks();
    });

    it('returns 401 for change-password without authentication', async () => {
        const { createApp } = await import('../../src/app');
        const app = createApp();

        const response = await request(app)
            .post('/api/auth/change-password')
            .send({
                currentPassword: 'CurrentPass123!',
                newPassword: 'ChangedPass123!',
            });

        expect(response.status).toBe(401);
    });

    it('returns 403 when authenticated user lacks own-profile update permission', async () => {
        const { JwtService } = await import('../../src/shared/services/jwt.service');
        jest
            .spyOn(JwtService.prototype, 'verifyAccessToken')
            .mockReturnValue({
                sub: 'u1',
                email: 'patient@demo.local',
                roles: ['Patient'],
                permissions: [],
            });

        const { createApp } = await import('../../src/app');
        const app = createApp();

        const response = await request(app)
            .patch('/api/users/me')
            .set('Authorization', 'Bearer token')
            .send({
                firstName: 'Updated',
            });

        expect(response.status).toBe(403);
    });

    it('creates an admin-managed user when authorization succeeds', async () => {
        const { JwtService } = await import('../../src/shared/services/jwt.service');
        const { AuthService } = await import('../../src/modules/auth/services/auth.service');

        jest
            .spyOn(JwtService.prototype, 'verifyAccessToken')
            .mockReturnValue({
                sub: 'admin-1',
                email: 'admin@medsphere.local',
                roles: ['Admin'],
                permissions: ['users:create:all', 'users:deactivate:all', 'users:read:all', 'users:update:all'],
            });

        jest
            .spyOn(AuthService.prototype, 'createAdminUser')
            .mockResolvedValue({
                message: 'User account created successfully.',
                user: {
                    id: 'u200',
                    email: 'doctor2@medsphere.local',
                    firstName: 'Ana',
                    lastName: 'Doctor',
                    isActive: true,
                    roles: ['Doctor'],
                },
            });

        const { createApp } = await import('../../src/app');
        const app = createApp();

        const response = await request(app)
            .post('/api/auth/admin/users')
            .set('Authorization', 'Bearer token')
            .send({
                firstName: 'Ana',
                lastName: 'Doctor',
                email: 'doctor2@medsphere.local',
                password: 'DoctorPass123!',
                roles: ['Doctor'],
            });

        expect(response.status).toBe(201);
        expect(response.body.user.email).toBe('doctor2@medsphere.local');
    });

    it('verifies email from emailed link query token', async () => {
        const { AuthService } = await import('../../src/modules/auth/services/auth.service');

        const verifySpy = jest
            .spyOn(AuthService.prototype, 'verifyEmail')
            .mockResolvedValue({
                success: true,
                message: 'Email verified successfully.',
            });

        const { createApp } = await import('../../src/app');
        const app = createApp();

        const response = await request(app).get('/api/auth/verify-email?token=raw-token');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(verifySpy).toHaveBeenCalledWith(
            expect.objectContaining({ token: 'raw-token' }),
        );
    });

    it('serves the swagger openapi document', async () => {
        const { createApp } = await import('../../src/app');
        const app = createApp();

        const response = await request(app).get('/docs/openapi.json');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.3');
        expect(response.body.paths['/api/auth/login']).toBeDefined();
    });

    it('serves the swagger ui page', async () => {
        const { createApp } = await import('../../src/app');
        const app = createApp();

        const response = await request(app).get('/docs');

        expect(response.status).toBe(200);
        expect(response.text).toContain('SwaggerUIBundle');
        expect(response.text).toContain('/docs/openapi.json');
    });
});
