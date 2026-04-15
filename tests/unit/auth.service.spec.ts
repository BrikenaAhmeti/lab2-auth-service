import { AppError } from '../../src/shared/core/errors/app-error';
import { AuthService } from '../../src/modules/auth/services/auth.service';
import { AuthRepository } from '../../src/modules/auth/domain/auth.repository';
import { UserRepository } from '../../src/modules/users/domain/user.repository';

function createMocks() {
    const userRepository: jest.Mocked<UserRepository> = {
        create: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        updateMyProfile: jest.fn(),
    };

    const authRepository: jest.Mocked<AuthRepository> = {
        getUserAuthByEmail: jest.fn(),
        getUserAuthById: jest.fn(),
        createRefreshToken: jest.fn(),
        findValidRefreshToken: jest.fn(),
        revokeRefreshToken: jest.fn(),
        revokeRefreshTokenById: jest.fn(),
        revokeRefreshTokenByIdAnyUser: jest.fn(),
        revokeAllRefreshTokensByUser: jest.fn(),
        touchRefreshToken: jest.fn(),
        listActiveSessions: jest.fn(),
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
    };

    const passwordService = {
        hash: jest.fn(),
        compare: jest.fn(),
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
    };

    return {
        userRepository,
        authRepository,
        passwordService,
        jwtService,
        tokenHashService,
        auditLogService,
    };
}

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('logs in active user and returns tokens', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
        );

        m.authRepository.getUserAuthByEmail.mockResolvedValue({
            id: 'u1',
            email: 'admin@medsphere.local',
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
        expect(result.user.roles).toEqual(['Super Admin']);
        expect(m.authRepository.createRefreshToken).toHaveBeenCalled();
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
        );

        m.authRepository.getUserAuthByEmail.mockResolvedValue({
            id: 'u1',
            email: 'patient@demo.local',
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
        );

        m.userRepository.findByEmail.mockResolvedValue(null);
        m.passwordService.hash.mockResolvedValue('hashed-password');
        m.userRepository.create.mockResolvedValue({
            id: 'u100',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@demo.local',
            isActive: false,
        });
        m.tokenHashService.hash.mockReturnValue('verify-hash');
        m.authRepository.createEmailVerificationToken.mockResolvedValue();

        const result = await service.registerPatient({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@demo.local',
            password: 'StrongPass123!',
        });

        expect(result.user.email).toBe('john@demo.local');
        expect(m.authRepository.createEmailVerificationToken).toHaveBeenCalled();
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

    it('requests and completes password reset', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
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

    it('revokes own session and throws when session does not exist', async () => {
        const m = createMocks();
        const service = new AuthService(
            m.userRepository,
            m.authRepository,
            m.passwordService as any,
            m.jwtService as any,
            m.tokenHashService as any,
            m.auditLogService as any,
        );

        m.authRepository.revokeRefreshTokenById.mockResolvedValue(false);

        await expect(
            service.revokeSession({
                userId: 'u1',
                sessionId: 'missing-session',
            }),
        ).rejects.toBeInstanceOf(AppError);
    });
});
