import { AppError } from '../../../shared/core/errors/app-error';
import { env } from '../../../config/env';
import crypto from 'crypto';
import { JwtService } from '../../../shared/services/jwt.service';
import { PasswordService } from '../../../shared/services/password.service';
import { TokenHashService } from '../../../shared/services/token-hash.service';
import { EmailService } from '../../../shared/services/email.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { UserRepository } from '../../users/domain/user.repository';
import { AuthRepository } from '../domain/auth.repository';

export class AuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly authRepository: AuthRepository,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
        private readonly tokenHashService: TokenHashService,
        private readonly auditLogService: AuditLogService,
        private readonly emailService: EmailService,
    ) { }

    private assertPasswordComplexity(password: string) {
        const complexity =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,100}$/;

        if (!complexity.test(password)) {
            throw new AppError(
                'Password must be 12-100 chars and include uppercase, lowercase, number, and special character',
                400,
            );
        }
    }

    private createOneTimeToken(hoursToExpire: number) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.tokenHashService.hash(rawToken);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hoursToExpire);

        return { rawToken, tokenHash, expiresAt };
    }

    private async sendVerificationEmail(email: string, token: string) {
        const verifyUrl = `${env.appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
        await this.emailService.send({
            to: email,
            subject: 'Verify your MedSphere account',
            text: `Verify your MedSphere account by opening: ${verifyUrl}`,
            html: `<p>Verify your MedSphere account by opening <a href="${verifyUrl}">${verifyUrl}</a>.</p>`,
        });
    }

    private async sendPasswordResetEmail(email: string, token: string) {
        const resetUrl = `${env.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
        await this.emailService.send({
            to: email,
            subject: 'Reset your MedSphere password',
            text: `Reset your MedSphere password by opening: ${resetUrl}`,
            html: `<p>Reset your MedSphere password by opening <a href="${resetUrl}">${resetUrl}</a>.</p>`,
        });
    }

    async registerPatient(input: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        phone?: string;
        dateOfBirth?: Date;
        gender?: string;
        personalNumber?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const email = input.email.trim().toLowerCase();

        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new AppError('Email already in use', 409);
        }

        this.assertPasswordComplexity(input.password);
        const passwordHash = await this.passwordService.hash(input.password);

        const user = await this.userRepository.create({
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email,
            passwordHash,
            phone: input.phone?.trim(),
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            personalNumber: input.personalNumber,
            isActive: false,
            emailVerifiedAt: null,
        });

        const patientRoles = await this.authRepository.findRolesByNames(['Patient']);
        if (patientRoles.length !== 1) {
            throw new AppError('Patient role is not configured', 500);
        }
        await this.authRepository.assignRolesToUser(user.id, [patientRoles[0].id]);

        const verification = this.createOneTimeToken(24);
        await this.authRepository.createEmailVerificationToken({
            userId: user.id,
            tokenHash: verification.tokenHash,
            expiresAt: verification.expiresAt,
        });
        await this.sendVerificationEmail(user.email, verification.rawToken);

        await this.auditLogService.log({
            userId: user.id,
            action: 'user.registered',
            entity: 'user',
            entityId: user.id,
            newValue: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            message: 'Registration successful. Verify your email to activate the account.',
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isActive: user.isActive,
            },
        };
    }

    async login(input: {
        email: string;
        password: string;
        deviceInfo?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const user = await this.authRepository.getUserAuthByEmail(
            input.email.trim().toLowerCase(),
        );

        if (!user) {
            await this.auditLogService.log({
                action: 'login.failed',
                entity: 'auth',
                newValue: { email: input.email },
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            });

            throw new AppError('Invalid credentials', 401);
        }

        if (!user.isActive) {
            throw new AppError('User account is inactive. Please verify your email.', 403);
        }

        const isValid = await this.passwordService.compare(
            input.password,
            user.passwordHash,
        );

        if (!isValid) {
            await this.auditLogService.log({
                userId: user.id,
                action: 'login.failed',
                entity: 'auth',
                entityId: user.id,
                newValue: { email: user.email },
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            });

            throw new AppError('Invalid credentials', 401);
        }

        const accessToken = this.jwtService.signAccessToken({
            sub: user.id,
            email: user.email,
            roles: user.roles,
            permissions: user.permissions,
        });

        const refreshToken = this.jwtService.signRefreshToken({
            sub: user.id,
        });

        const tokenHash = this.tokenHashService.hash(refreshToken);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.authRepository.createRefreshToken({
            userId: user.id,
            tokenHash,
            expiresAt,
            deviceInfo: input.deviceInfo,
            ipAddress: input.ipAddress,
            lastUsedAt: new Date(),
        });

        await this.auditLogService.log({
            userId: user.id,
            action: 'login.success',
            entity: 'auth',
            entityId: user.id,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roles,
                permissions: user.permissions,
            },
        };
    }

    async refresh(input: {
        refreshToken: string;
        deviceInfo?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        let payload: { sub: string };

        try {
            payload = this.jwtService.verifyRefreshToken(input.refreshToken);
        } catch {
            throw new AppError('Invalid refresh token', 401);
        }

        const tokenHash = this.tokenHashService.hash(input.refreshToken);
        const existing = await this.authRepository.findValidRefreshToken(tokenHash);

        if (!existing) {
            throw new AppError('Refresh token not found or revoked', 401);
        }

        await this.authRepository.touchRefreshToken(tokenHash);
        await this.authRepository.revokeRefreshToken(tokenHash);

        const user = await this.authRepository.getUserAuthById(payload.sub);
        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', 401);
        }

        const accessToken = this.jwtService.signAccessToken({
            sub: user.id,
            email: user.email,
            roles: user.roles,
            permissions: user.permissions,
        });

        const refreshToken = this.jwtService.signRefreshToken({
            sub: user.id,
        });

        const newHash = this.tokenHashService.hash(refreshToken);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.authRepository.createRefreshToken({
            userId: user.id,
            tokenHash: newHash,
            expiresAt,
            deviceInfo: input.deviceInfo,
            ipAddress: input.ipAddress,
            lastUsedAt: new Date(),
        });

        await this.auditLogService.log({
            userId: user.id,
            action: 'token.refresh',
            entity: 'auth',
            entityId: user.id,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roles,
                permissions: user.permissions,
            },
        };
    }

    async logout(input: {
        refreshToken: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        let userId: string | undefined;
        try {
            const payload = this.jwtService.verifyRefreshToken(input.refreshToken);
            userId = payload.sub;
        } catch {
            userId = undefined;
        }

        const tokenHash = this.tokenHashService.hash(input.refreshToken);
        await this.authRepository.revokeRefreshToken(tokenHash);

        await this.auditLogService.log({
            userId,
            action: 'logout',
            entity: 'auth',
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true };
    }

    async me(userId: string) {
        const user = await this.authRepository.getUserAuthById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            permissions: user.permissions,
        };
    }

    async getSessions(userId: string) {
        return this.authRepository.listActiveSessions(userId);
    }

    async revokeSession(input: {
        userId: string;
        sessionId: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const revoked = await this.authRepository.revokeRefreshTokenById(
            input.sessionId,
            input.userId,
        );

        if (!revoked) {
            throw new AppError('Session not found', 404);
        }

        await this.auditLogService.log({
            userId: input.userId,
            action: 'session.revoked',
            entity: 'refresh_token',
            entityId: input.sessionId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true };
    }

    async revokeSessionAsAdmin(input: {
        actorUserId: string;
        sessionId: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const revoked = await this.authRepository.revokeRefreshTokenByIdAnyUser(
            input.sessionId,
        );

        if (!revoked) {
            throw new AppError('Session not found', 404);
        }

        await this.auditLogService.log({
            userId: input.actorUserId,
            action: 'session.revoked.admin',
            entity: 'refresh_token',
            entityId: input.sessionId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true };
    }

    async verifyEmail(input: {
        token: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const tokenHash = this.tokenHashService.hash(input.token);
        const verificationToken =
            await this.authRepository.findValidEmailVerificationToken(tokenHash);

        if (!verificationToken) {
            throw new AppError('Invalid or expired verification token', 400);
        }

        await this.authRepository.markEmailVerificationTokenUsed(verificationToken.id);
        await this.authRepository.markUserEmailVerified(verificationToken.userId);

        await this.auditLogService.log({
            userId: verificationToken.userId,
            action: 'email.verified',
            entity: 'user',
            entityId: verificationToken.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true, message: 'Email verified successfully.' };
    }

    async resendVerificationEmail(input: {
        email: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());

        if (!user) {
            return { success: true, message: 'If the email exists, a verification link was sent.' };
        }

        if (user.emailVerifiedAt) {
            return { success: true, message: 'Email is already verified.' };
        }

        await this.authRepository.invalidateEmailVerificationTokens(user.id);

        const verification = this.createOneTimeToken(24);
        await this.authRepository.createEmailVerificationToken({
            userId: user.id,
            tokenHash: verification.tokenHash,
            expiresAt: verification.expiresAt,
        });
        await this.sendVerificationEmail(user.email, verification.rawToken);

        await this.auditLogService.log({
            userId: user.id,
            action: 'email.verification.resent',
            entity: 'user',
            entityId: user.id,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            success: true,
            message: 'Verification link has been re-issued.',
        };
    }

    async requestPasswordReset(input: {
        email: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const user = await this.userRepository.findByEmail(input.email.trim().toLowerCase());
        if (!user) {
            return { success: true, message: 'If the email exists, a reset link was sent.' };
        }

        await this.authRepository.invalidatePasswordResetTokens(user.id);

        const reset = this.createOneTimeToken(1);
        await this.authRepository.createPasswordResetToken({
            userId: user.id,
            tokenHash: reset.tokenHash,
            expiresAt: reset.expiresAt,
        });
        await this.sendPasswordResetEmail(user.email, reset.rawToken);

        await this.auditLogService.log({
            userId: user.id,
            action: 'password.reset.requested',
            entity: 'user',
            entityId: user.id,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            success: true,
            message: 'Password reset link has been issued.',
        };
    }

    async resetPassword(input: {
        token: string;
        newPassword: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        this.assertPasswordComplexity(input.newPassword);

        const tokenHash = this.tokenHashService.hash(input.token);
        const resetToken = await this.authRepository.findValidPasswordResetToken(tokenHash);
        if (!resetToken) {
            throw new AppError('Invalid or expired reset token', 400);
        }

        const passwordHash = await this.passwordService.hash(input.newPassword);
        await this.authRepository.updateUserPasswordHash(resetToken.userId, passwordHash);
        await this.authRepository.markPasswordResetTokenUsed(resetToken.id);
        await this.authRepository.invalidatePasswordResetTokens(resetToken.userId);
        await this.authRepository.revokeAllRefreshTokensByUser(resetToken.userId);

        await this.auditLogService.log({
            userId: resetToken.userId,
            action: 'password.reset.completed',
            entity: 'user',
            entityId: resetToken.userId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true, message: 'Password has been reset successfully.' };
    }

    async changePassword(input: {
        userId: string;
        currentPassword: string;
        newPassword: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const user = await this.authRepository.getUserAuthById(input.userId);
        if (!user || !user.isActive) {
            throw new AppError('User not found', 404);
        }

        const isValid = await this.passwordService.compare(
            input.currentPassword,
            user.passwordHash,
        );

        if (!isValid) {
            throw new AppError('Current password is incorrect', 400);
        }

        this.assertPasswordComplexity(input.newPassword);
        const passwordHash = await this.passwordService.hash(input.newPassword);
        await this.authRepository.updateUserPasswordHash(user.id, passwordHash);
        await this.authRepository.revokeAllRefreshTokensByUser(user.id);

        await this.auditLogService.log({
            userId: user.id,
            action: 'password.changed',
            entity: 'user',
            entityId: user.id,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            success: true,
            message: 'Password changed successfully. Please sign in again on your devices.',
        };
    }

    async createAdminUser(input: {
        actorUserId: string;
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        roles: string[];
        phone?: string;
        dateOfBirth?: Date;
        gender?: string;
        personalNumber?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const email = input.email.trim().toLowerCase();
        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new AppError('Email already in use', 409);
        }

        this.assertPasswordComplexity(input.password);

        const normalizedRoles = Array.from(
            new Set(input.roles.map((role) => role.trim()).filter(Boolean)),
        );

        if (normalizedRoles.length === 0) {
            throw new AppError('At least one role is required', 400);
        }

        const roles = await this.authRepository.findRolesByNames(normalizedRoles);
        if (roles.length !== normalizedRoles.length) {
            throw new AppError('One or more roles are invalid', 400);
        }

        const passwordHash = await this.passwordService.hash(input.password);
        const user = await this.authRepository.createUserWithRoles(
            {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                email,
                passwordHash,
                phone: input.phone?.trim(),
                dateOfBirth: input.dateOfBirth,
                gender: input.gender,
                personalNumber: input.personalNumber,
                createdBy: input.actorUserId,
            },
            roles.map((role) => role.id),
        );

        await this.auditLogService.log({
            userId: input.actorUserId,
            action: 'user.created.admin',
            entity: 'user',
            entityId: user.id,
            newValue: {
                email: user.email,
                roles: user.roles,
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            message: 'User account created successfully.',
            user,
        };
    }
}
