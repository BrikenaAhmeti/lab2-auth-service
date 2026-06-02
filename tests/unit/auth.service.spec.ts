import { AppError } from '../../src/shared/core/errors/app-error';
import { AuthService } from '../../src/modules/auth/services/auth.service';
import { AuthRepository } from '../../src/modules/auth/domain/auth.repository';
import { UserRepository } from '../../src/modules/users/domain/user.repository';
import { EmailService } from '../../src/shared/services/email.service';

function createMocks() {
    const userRepository: jest.Mocked<UserRepository> = {
        create: jest.fn(),
        findById: jest.fn(),
        findByIds: jest.fn(),
        findByEmail: jest.fn(),
        findByUsername: jest.fn(),
        findByPersonalNumber: jest.fn(),
        findDoctors: jest.fn(),
        updateMyProfile: jest.fn(),
    };

    const authRepository: jest.Mocked<AuthRepository> = {
        getUserAuthByIdentifier: jest.fn(),
        getUserAuthById: jest.fn(),
        createRefreshToken: jest.fn(),
        findValidRefreshToken: jest.fn(),
        revokeRefreshToken: jest.fn(),
        revokeRefreshTokenById: jest.fn(),
        revokeRefreshTokenByIdAnyUser: jest.fn(),
        revokeAllRefreshTokensByUser: jest.fn(),
        touchRefreshToken: jest.fn(),
        listActiveSessions: jest.fn(),
        listAllActiveSessions: jest.fn(),
        findActiveSessionById: jest.fn(),
        createEmailVerificationToken: jest.fn(),
        invalidateEmailVerificationTokens: jest.fn(),
        findValidEmailVerificationToken: jest.fn(),
        markEmailVerificationTokenUsed: jest.fn(),
        markUserEmailVerified: jest.fn(),
        createPasswordResetToken: jest.fn(),
        invalidatePasswordResetTokens: jest.fn(),
        findValidPasswordResetToken: jest.fn(),
        markPasswordResetTokenUsed: jest.fn(),
        updateUserPasswordHash: jest.fn(),
        findRolesByNames: jest.fn(),
        createUserWithRoles: jest.fn(),
        assignRolesToUser: jest.fn(),
    };

    const passwordService = {
        hash: jest.fn(),
        compare: jest.fn(),
        generateTemporaryPassword: jest.fn(),
    };

    const jwtService = {
        signAccessToken: jest.fn(),
        signRefreshToken: jest.fn(),
        verifyAccessToken: jest.fn(),
        verifyRefreshToken: jest.fn(),
    };

    const tokenHashService = {
        hash: jest.fn(),
    };

    const auditLogService = {
        log: jest.fn(),
        listSessionLogs: jest.fn(),
    };

    const emailService: jest.Mocked<EmailService> = {
        send: jest.fn(),
    };

    return {
        userRepository,
        authRepository,
        passwordService,
        jwtService,
        tokenHashService,
        auditLogService,
        emailService,
    };
}

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const activeSession = {
        id: 'session-1',
        userId: 'u1',
        deviceInfo: 'Mozilla/5.0 Chrome/148.0.0.0',
        ipAddress: '127.0.0.1',
        createdAt: new Date('2026-06-02T10:00:00.000Z'),
        lastUsedAt: new Date('2026-06-02T10:10:00.000Z'),
        expiresAt: new Date('2026-06-09T10:00:00.000Z'),
        user: {
            id: 'u1',
            email: 'admin@medsphere.local',
            username: 'admin',
            firstName: 'Admin',
            lastName: 'User',
        },
    };

    it('logs in active user and returns tokens', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.getUserAuthByIdentifier.mockResolvedValue({
            id: 'u1',
            email: 'admin@medsphere.local',
            username: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: 'hashed',
            isActive: true,
            roles: ['Super Admin'],
            permissions: ['users:read:all'],
        });
        m.passwordService.compare.mockResolvedValue(true);
        m.jwtService.signAccessToken.mockReturnValue('access-token');
        m.jwtService.signRefreshToken.mockReturnValue('refresh-token');
        m.tokenHashService.hash.mockReturnValue('refresh-hash');
        m.authRepository.createRefreshToken.mockResolvedValue();

        const result = await service.login({
            email: 'admin@medsphere.local',
            password: 'Admin1234!Pass',
        });

        expect(result.accessToken).toBe('access-token');
        expect(result.refreshToken).toBe('refresh-token');
        expect(result.user.username).toBe('admin');
        expect(result.user.roles).toEqual(['Super Admin']);
        expect(m.authRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('sends contact acknowledgement email through the configured email service', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        const result = await service.sendContactAcknowledgementEmail({
            name: ' Ada Lovelace ',
            email: 'ADA@EXAMPLE.COM',
            subject: ' Appointment question ',
        });

        expect(result.success).toBe(true);
        expect(m.emailService.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'ada@example.com',
                subject: 'We received your MedSphere message',
                text: expect.stringContaining('Appointment question'),
                html: expect.stringContaining('Appointment question'),
            }),
        );
    });

    it('logs in with username through the existing email field', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.getUserAuthByIdentifier.mockResolvedValue({
            id: 'u1',
            email: 'admin@medsphere.local',
            username: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: 'hashed',
            isActive: true,
            roles: ['Super Admin'],
            permissions: ['users:read:all'],
        });
        m.passwordService.compare.mockResolvedValue(true);
        m.jwtService.signAccessToken.mockReturnValue('access-token');
        m.jwtService.signRefreshToken.mockReturnValue('refresh-token');
        m.tokenHashService.hash.mockReturnValue('refresh-hash');
        m.authRepository.createRefreshToken.mockResolvedValue();

        const result = await service.login({
            email: ' Admin ',
            password: 'Admin1234!Pass',
        });

        expect(m.authRepository.getUserAuthByIdentifier).toHaveBeenCalledWith('admin');
        expect(result.user.email).toBe('admin@medsphere.local');
        expect(result.user.username).toBe('admin');
    });

    it('rejects login for inactive user', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.getUserAuthByIdentifier.mockResolvedValue({
            id: 'u1',
            email: 'patient@demo.local',
            username: 'patient',
            firstName: 'Patient',
            lastName: 'User',
            passwordHash: 'hashed',
            isActive: false,
            roles: ['Patient'],
            permissions: [],
        });

        await expect(
            service.login({
                email: 'patient@demo.local',
                password: 'SomePassword123!',
            }),
        ).rejects.toBeInstanceOf(AppError);
    });

    it('rotates refresh token on refresh call', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.jwtService.verifyRefreshToken.mockReturnValue({ sub: 'u1' });
        m.tokenHashService.hash
            .mockReturnValueOnce('old-hash')
            .mockReturnValueOnce('new-hash');
        m.authRepository.findValidRefreshToken.mockResolvedValue({ id: 'rt1' });
        m.authRepository.touchRefreshToken.mockResolvedValue();
        m.authRepository.revokeRefreshToken.mockResolvedValue(1);
        m.authRepository.getUserAuthById.mockResolvedValue({
            id: 'u1',
            email: 'admin@medsphere.local',
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: 'hashed',
            isActive: true,
            roles: ['Super Admin'],
            permissions: ['users:read:all'],
        });
        m.jwtService.signAccessToken.mockReturnValue('new-access');
        m.jwtService.signRefreshToken.mockReturnValue('new-refresh');
        m.authRepository.createRefreshToken.mockResolvedValue();

        const result = await service.refresh({ refreshToken: 'old-raw-token' });

        expect(result.accessToken).toBe('new-access');
        expect(result.refreshToken).toBe('new-refresh');
        expect(m.authRepository.touchRefreshToken).toHaveBeenCalledWith('old-hash');
        expect(m.authRepository.revokeRefreshToken).toHaveBeenCalledWith('old-hash');
    });

    it('rejects refresh when token is not found', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.jwtService.verifyRefreshToken.mockReturnValue({ sub: 'u1' });
        m.tokenHashService.hash.mockReturnValue('missing-hash');
        m.authRepository.findValidRefreshToken.mockResolvedValue(null);

        await expect(service.refresh({ refreshToken: 'invalid' })).rejects.toBeInstanceOf(
            AppError,
        );
    });

    it('registers patient and creates email verification token', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.userRepository.findByEmail.mockResolvedValue(null);
        m.userRepository.findByUsername.mockResolvedValue(null);
        m.userRepository.findByPersonalNumber.mockResolvedValue(null);
        m.authRepository.findRolesByNames.mockResolvedValue([{ id: 'role-patient', name: 'Patient' }]);
        m.authRepository.assignRolesToUser.mockResolvedValue();
        m.passwordService.hash.mockResolvedValue('hashed-password');
        m.userRepository.create.mockResolvedValue({
            id: 'u100',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@demo.local',
            username: 'john',
            isActive: false,
        });
        m.tokenHashService.hash.mockReturnValue('verify-hash');
        m.authRepository.createEmailVerificationToken.mockResolvedValue();

        const result = await service.registerPatient({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@demo.local',
            username: 'John',
            password: 'StrongPass123!',
            personalNumber: ' 1234567890 ',
        });

        expect(result.user.email).toBe('john@demo.local');
        expect(result.user.username).toBe('john');
        expect(m.userRepository.findByUsername).toHaveBeenCalledWith('john');
        expect(m.userRepository.findByPersonalNumber).toHaveBeenCalledWith('1234567890');
        expect(m.userRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ personalNumber: '1234567890' }),
        );
        expect(m.tokenHashService.hash).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/));
        expect(m.authRepository.createEmailVerificationToken).toHaveBeenCalledWith(
            expect.objectContaining({ tokenHash: 'verify-hash' }),
        );
        expect(m.authRepository.assignRolesToUser).toHaveBeenCalledWith('u100', ['role-patient']);
        expect(m.emailService.send).toHaveBeenCalled();
        expect(m.emailService.send.mock.calls[0][0].text).toContain(
            'Your verification code is:',
        );
    });

    it('requires personal number when a patient registers', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        await expect(
            service.registerPatient({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@demo.local',
                password: 'StrongPass123!',
                personalNumber: ' ',
            }),
        ).rejects.toBeInstanceOf(AppError);

        expect(m.userRepository.create).not.toHaveBeenCalled();
    });

    it('verifies email with valid token', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.tokenHashService.hash.mockReturnValue('verify-hash');
        m.authRepository.findValidEmailVerificationToken.mockResolvedValue({
            id: 'evt1',
            userId: 'u1',
        });
        m.authRepository.markEmailVerificationTokenUsed.mockResolvedValue();
        m.authRepository.markUserEmailVerified.mockResolvedValue();

        const result = await service.verifyEmail({ token: 'raw-token' });

        expect(result.success).toBe(true);
        expect(m.authRepository.markUserEmailVerified).toHaveBeenCalledWith('u1');
    });

    it('verifies email with email and one-time code', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.userRepository.findByEmail.mockResolvedValue({
            id: 'u1',
            email: 'patient@demo.local',
            emailVerifiedAt: null,
        });
        m.tokenHashService.hash.mockReturnValue('verify-hash');
        m.authRepository.findValidEmailVerificationToken.mockResolvedValue({
            id: 'evt1',
            userId: 'u1',
        });
        m.authRepository.markEmailVerificationTokenUsed.mockResolvedValue();
        m.authRepository.markUserEmailVerified.mockResolvedValue();

        const result = await service.verifyEmail({
            email: ' Patient@Demo.Local ',
            code: '123456',
        });

        expect(result.success).toBe(true);
        expect(m.tokenHashService.hash).toHaveBeenCalledWith('123456');
        expect(m.authRepository.markUserEmailVerified).toHaveBeenCalledWith('u1');
    });

    it('links the patient profile by personal number during email verification', async () => {
        const m = createMocks();
        const patientProfileLinker = {
            linkByPersonalNumber: jest.fn().mockResolvedValue({
                linked: true,
                patientId: 'patient-1',
                userId: 'u1',
            }),
        };
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
            patientProfileLinker,
        );

        m.tokenHashService.hash.mockReturnValue('verify-hash');
        m.authRepository.findValidEmailVerificationToken.mockResolvedValue({
            id: 'evt1',
            userId: 'u1',
        });
        m.userRepository.findById.mockResolvedValue({
            id: 'u1',
            personalNumber: '1234567890',
        });
        m.authRepository.markEmailVerificationTokenUsed.mockResolvedValue();
        m.authRepository.markUserEmailVerified.mockResolvedValue();

        const result = await service.verifyEmail({ token: 'raw-token' });

        expect(result.success).toBe(true);
        expect(patientProfileLinker.linkByPersonalNumber).toHaveBeenCalledWith({
            userId: 'u1',
            personalNumber: '1234567890',
        });
        expect(m.authRepository.markUserEmailVerified).toHaveBeenCalledWith('u1');
    });

    it('returns a dev-only verification code when email delivery fails outside production', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.userRepository.findByEmail.mockResolvedValue(null);
        m.userRepository.findByUsername.mockResolvedValue(null);
        m.userRepository.findByPersonalNumber.mockResolvedValue(null);
        m.authRepository.findRolesByNames.mockResolvedValue([{ id: 'role-patient', name: 'Patient' }]);
        m.authRepository.assignRolesToUser.mockResolvedValue();
        m.passwordService.hash.mockResolvedValue('hashed-password');
        m.userRepository.create.mockResolvedValue({
            id: 'u100',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@demo.local',
            username: null,
            isActive: false,
        });
        m.tokenHashService.hash.mockReturnValue('verify-hash');
        m.authRepository.createEmailVerificationToken.mockResolvedValue();
        m.emailService.send.mockRejectedValue(new Error('SMTP unavailable'));

        const result = await service.registerPatient({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@demo.local',
            password: 'StrongPass123!',
            personalNumber: '1234567890',
        });

        expect(result.devVerificationCode).toMatch(/^\d{6}$/);
        expect(result.emailDeliveryWarning).toContain('outside production');
    });

    it('requests and completes password reset', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.userRepository.findByEmail.mockResolvedValue({
            id: 'u9',
            email: 'user@demo.local',
        });
        m.tokenHashService.hash.mockReturnValue('reset-hash');
        m.authRepository.invalidatePasswordResetTokens.mockResolvedValue();
        m.authRepository.createPasswordResetToken.mockResolvedValue();

        const requestResult = await service.requestPasswordReset({
            email: 'user@demo.local',
        });
        expect(requestResult.success).toBe(true);
        const resetEmail = m.emailService.send.mock.calls[0][0];
        expect(m.emailService.send).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: 'Your MedSphere reset code',
                text: expect.stringContaining('Your password reset code is:'),
                html: expect.stringContaining('Your password reset code is:'),
            }),
        );
        expect(resetEmail.text).toMatch(/\b\d{6}\b/);
        expect(resetEmail.html).toMatch(/\b\d{6}\b/);
        expect(resetEmail.text).not.toContain('medspheremobile://reset-password');
        expect(resetEmail.html).not.toContain('medspheremobile://reset-password');
        expect(m.tokenHashService.hash).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/));
        expect(m.authRepository.createPasswordResetToken).toHaveBeenCalledWith(
            expect.objectContaining({
                tokenHash: 'reset-hash',
                expiresAt: expect.any(Date),
            }),
        );

        m.authRepository.findValidPasswordResetToken.mockResolvedValue({
            id: 'prt1',
            userId: 'u9',
        });
        m.passwordService.hash.mockResolvedValue('new-hashed-password');
        m.authRepository.updateUserPasswordHash.mockResolvedValue();
        m.authRepository.markPasswordResetTokenUsed.mockResolvedValue();
        m.authRepository.invalidatePasswordResetTokens.mockResolvedValue();
        m.authRepository.revokeAllRefreshTokensByUser.mockResolvedValue(2);

        const resetResult = await service.resetPassword({
            token: 'raw-reset-token',
            newPassword: 'AnotherStrong123!',
        });

        expect(resetResult.success).toBe(true);
        expect(m.authRepository.updateUserPasswordHash).toHaveBeenCalledWith(
            'u9',
            'new-hashed-password',
        );
    });

    it('returns all active sessions for admins and own sessions for regular users', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.listAllActiveSessions.mockResolvedValue([activeSession]);
        m.authRepository.listActiveSessions.mockResolvedValue([activeSession]);

        await expect(
            service.getSessions({ userId: 'admin-1', roles: ['Super Admin'] }),
        ).resolves.toEqual([activeSession]);
        expect(m.authRepository.listAllActiveSessions).toHaveBeenCalled();

        await expect(
            service.getSessions({ userId: 'u1', roles: ['Patient'] }),
        ).resolves.toEqual([activeSession]);
        expect(m.authRepository.listActiveSessions).toHaveBeenCalledWith('u1');
    });

    it('lists session logs with actor scope and filters', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );
        const result = {
            items: [],
            meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
        };

        m.auditLogService.listSessionLogs.mockResolvedValue(result);

        await expect(
            service.getSessionLogs({
                viewerUserId: 'u1',
                roles: ['Patient'],
                page: 1,
                limit: 25,
                action: 'login.success',
                changed: 'chrome',
            }),
        ).resolves.toBe(result);

        expect(m.auditLogService.listSessionLogs).toHaveBeenCalledWith(
            expect.objectContaining({
                viewerUserId: 'u1',
                canViewAll: false,
                action: 'login.success',
                changed: 'chrome',
            }),
        );
    });

    it('revokes own session and throws when session does not exist', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.findActiveSessionById.mockResolvedValue(null);

        await expect(
            service.revokeSession({
                userId: 'u1',
                sessionId: 'missing-session',
            }),
        ).rejects.toBeInstanceOf(AppError);
    });

    it('logs session revoke details with the affected user and device', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.findActiveSessionById.mockResolvedValue(activeSession);
        m.authRepository.revokeRefreshTokenByIdAnyUser.mockResolvedValue(true);

        const result = await service.revokeSessionAsAdmin({
            actorUserId: 'admin-1',
            sessionId: 'session-1',
            ipAddress: '127.0.0.1',
        });

        expect(result.success).toBe(true);
        expect(m.auditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'admin-1',
                action: 'session.revoked.admin',
                entityId: 'session-1',
                oldValue: expect.objectContaining({
                    user: expect.objectContaining({
                        email: 'admin@medsphere.local',
                        username: 'admin',
                    }),
                    deviceInfo: 'Mozilla/5.0 Chrome/148.0.0.0',
                }),
                newValue: expect.objectContaining({
                    targetUserId: 'u1',
                    revokedByUserId: 'admin-1',
                }),
            }),
        );
    });

    it('changes password for authenticated user and revokes sessions', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.authRepository.getUserAuthById.mockResolvedValue({
            id: 'u1',
            email: 'user@demo.local',
            firstName: 'Demo',
            lastName: 'User',
            passwordHash: 'existing-hash',
            isActive: true,
            roles: ['Patient'],
            permissions: ['users:read:own', 'users:update:own'],
        });
        m.passwordService.compare.mockResolvedValue(true);
        m.passwordService.hash.mockResolvedValue('new-hash');
        m.authRepository.updateUserPasswordHash.mockResolvedValue();
        m.authRepository.revokeAllRefreshTokensByUser.mockResolvedValue(3);

        const result = await service.changePassword({
            userId: 'u1',
            currentPassword: 'CurrentPass123!',
            newPassword: 'ChangedPass123!',
        });

        expect(result.success).toBe(true);
        expect(m.authRepository.updateUserPasswordHash).toHaveBeenCalledWith('u1', 'new-hash');
        expect(m.authRepository.revokeAllRefreshTokensByUser).toHaveBeenCalledWith('u1');
    });

    it('creates an admin-managed user with assigned roles', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
            m.emailService,
        );

        m.userRepository.findByEmail.mockResolvedValue(null);
        m.userRepository.findByUsername.mockResolvedValue(null);
        m.authRepository.findRolesByNames.mockResolvedValue([
            { id: 'r1', name: 'Doctor' },
        ]);
        m.passwordService.generateTemporaryPassword.mockReturnValue('TempPassword123!');
        m.passwordService.hash.mockResolvedValue('admin-created-hash');
        m.authRepository.createUserWithRoles.mockResolvedValue({
            id: 'u200',
            email: 'doctor2@medsphere.local',
            username: 'doctor2',
            firstName: 'Ana',
            lastName: 'Doctor',
            isActive: true,
            roles: ['Doctor'],
        });

        const result = await service.createAdminUser({
            actorUserId: 'admin-1',
            firstName: 'Ana',
            lastName: 'Doctor',
            email: 'doctor2@medsphere.local',
            username: 'Doctor2',
            roles: ['Doctor'],
        });

        expect(result.user.roles).toEqual(['Doctor']);
        expect(result.user.username).toBe('doctor2');
        expect(m.userRepository.findByUsername).toHaveBeenCalledWith('doctor2');
        expect(m.passwordService.hash).toHaveBeenCalledWith('TempPassword123!');
        expect(m.authRepository.createUserWithRoles).toHaveBeenCalled();
        expect(m.emailService.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'doctor2@medsphere.local',
                subject: 'Your MedSphere account is ready',
                text: expect.stringContaining('Temporary password: TempPassword123!'),
            }),
        );
    });
});
