import { AppError } from '../../../shared/core/errors/app-error';
import { env } from '../../../config/env';
import crypto from 'crypto';
import { JwtService } from '../../../shared/services/jwt.service';
import { PasswordService } from '../../../shared/services/password.service';
import { TokenHashService } from '../../../shared/services/token-hash.service';
import { EmailService } from '../../../shared/services/email.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { UserRepository } from '../../users/domain/user.repository';
import { ActiveSessionView, AuthRepository, AuthUserView } from '../domain/auth.repository';
import { PatientProfileLinker } from '../domain/patient-profile-linker';

export class AuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly authRepository: AuthRepository,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
        private readonly tokenHashService: TokenHashService,
        private readonly auditLogService: AuditLogService,
        private readonly emailService: EmailService,
        private readonly patientProfileLinker?: PatientProfileLinker,
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

    private normalizeUsername(username?: string | null) {
        if (!username) {
            return undefined;
        }

        const normalized = username.trim().toLowerCase();
        const usernameFormat = /^[a-z0-9._-]{3,30}$/;

        if (!usernameFormat.test(normalized)) {
            throw new AppError(
                'Username must be 3-30 characters and contain only letters, numbers, dots, underscores, or hyphens',
                400,
            );
        }

        return normalized;
    }

    private canViewAllSessions(roles: string[]) {
        return roles.includes('Admin') || roles.includes('Super Admin');
    }

    private isPatientUser(user: Pick<AuthUserView, 'roles'>) {
        return user.roles.includes('Patient');
    }

    private patientProfileFields(patientId?: string | null) {
        if (!patientId) {
            return {};
        }

        return {
            patientId,
            patientProfileId: patientId,
            profileId: patientId,
        };
    }

    private patientProfileLinkPayload(user: Pick<
        AuthUserView,
        'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'gender' | 'personalNumber'
    >) {
        return {
            userId: user.id,
            personalNumber: user.personalNumber!,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone ?? null,
            dateOfBirth: user.dateOfBirth ?? null,
            gender: user.gender ?? null,
        };
    }

    private async resolvePatientProfileFields(user: AuthUserView) {
        if (!this.patientProfileLinker || !this.isPatientUser(user)) {
            return {};
        }

        try {
            const profile = await this.patientProfileLinker.findByUserId(user.id);
            const patientId = profile.patientId ?? profile.patientProfileId;

            if (patientId) {
                return this.patientProfileFields(patientId);
            }
        } catch (error) {
            if (!(error instanceof AppError) || error.statusCode !== 404) {
                return {};
            }
        }

        if (!user.personalNumber) {
            return {};
        }

        try {
            const linkedProfile = await this.patientProfileLinker.linkByPersonalNumber(
                this.patientProfileLinkPayload(user),
            );

            return this.patientProfileFields(linkedProfile.patientId);
        } catch {
            return {};
        }
    }

    private async sessionUser(user: AuthUserView) {
        const patientProfile = await this.resolvePatientProfileFields(user);

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            permissions: user.permissions,
            ...patientProfile,
        };
    }

    private sessionAuditValue(session: ActiveSessionView) {
        return {
            sessionId: session.id,
            userId: session.userId,
            deviceInfo: session.deviceInfo ?? null,
            ipAddress: session.ipAddress ?? null,
            createdAt: session.createdAt.toISOString(),
            lastUsedAt: session.lastUsedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            user: {
                id: session.user.id,
                email: session.user.email,
                username: session.user.username ?? null,
                firstName: session.user.firstName,
                lastName: session.user.lastName,
            },
        };
    }

    private normalizePersonalNumber(personalNumber?: string | null) {
        const normalized = personalNumber?.trim();

        if (!normalized) {
            throw new AppError('Personal number is required for patient registration', 400);
        }

        if (normalized.length > 50) {
            throw new AppError('Personal number must be at most 50 characters', 400);
        }

        return normalized;
    }

    private normalizeVerificationCode(code?: string | null) {
        const normalized = code?.trim();

        if (!normalized || !/^\d{6}$/.test(normalized)) {
            throw new AppError('Verification code must be 6 digits', 400);
        }

        return normalized;
    }

    private createOneTimeToken(hoursToExpire: number) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.tokenHashService.hash(rawToken);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hoursToExpire);

        return { rawToken, tokenHash, expiresAt };
    }

    private createEmailVerificationToken(minutesToExpire: number) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.tokenHashService.hash(rawToken);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + minutesToExpire);

        return { rawToken, tokenHash, expiresAt };
    }

    private hashEmailVerificationCode(userId: string, code: string) {
        return this.tokenHashService.hash(`${userId}:${code}`);
    }

    private buildTokenUrl(baseUrl: string, token: string) {
        const url = new URL(baseUrl);
        url.searchParams.set('token', token);
        return url.toString();
    }

    private async sendVerificationEmail(email: string, token: string) {
        const verificationUrl = this.buildTokenUrl(env.emailVerificationUrl, token);
        await this.emailService.send({
            to: email,
            subject: 'Verify your MedSphere account',
            text: [
                'Welcome to MedSphere.',
                `Verify your account by opening this link: ${verificationUrl}`,
                'This link expires in 15 minutes.',
            ].join('\n\n'),
            html: [
                '<p>Welcome to MedSphere.</p>',
                `<p>Verify your account by opening <a href="${this.escapeHtml(verificationUrl)}">this MedSphere verification link</a>.</p>`,
                `<p>If the button does not work, copy this URL: <br /><a href="${this.escapeHtml(verificationUrl)}">${this.escapeHtml(verificationUrl)}</a></p>`,
                '<p>This link expires in 15 minutes.</p>',
            ].join(''),
        });
    }

    private async sendPasswordResetEmail(email: string, token: string) {
        const resetUrl = this.buildTokenUrl(env.passwordResetUrl, token);
        await this.emailService.send({
            to: email,
            subject: 'Reset your MedSphere password',
            text: `Reset your MedSphere password by opening: ${resetUrl}`,
            html: `<p>Reset your MedSphere password by opening <a href="${resetUrl}">${resetUrl}</a>.</p>`,
        });
    }

    async sendContactAcknowledgementEmail(input: {
        name: string;
        email: string;
        subject: string;
    }) {
        const name = input.name.trim();
        const email = input.email.trim().toLowerCase();
        const subject = input.subject.trim();

        await this.emailService.send({
            to: email,
            subject: 'We received your MedSphere message',
            text: [
                `Hello ${name || 'there'},`,
                `We received your message${subject ? ` about "${subject}"` : ''}.`,
                'Our team will review it and will be in touch soon.',
                'Thank you for contacting MedSphere.',
            ].join('\n\n'),
            html: [
                `<p>Hello ${this.escapeHtml(name || 'there')},</p>`,
                `<p>We received your message${subject ? ` about <strong>${this.escapeHtml(subject)}</strong>` : ''}.</p>`,
                '<p>Our team will review it and will be in touch soon.</p>',
                '<p>Thank you for contacting MedSphere.</p>',
            ].join(''),
        });

        return {
            success: true,
            message: 'Contact acknowledgement email sent.',
        };
    }

    async sendContactReplyEmail(input: {
        name: string;
        email: string;
        subject: string;
        replyText: string;
    }) {
        const name = input.name.trim();
        const email = input.email.trim().toLowerCase();
        const subject = input.subject.trim();
        const replyText = input.replyText.trim();
        const escapedReplyText = this.escapeHtml(replyText).replace(/\r?\n/g, '<br />');

        await this.emailService.send({
            to: email,
            subject: `Re: ${subject}`,
            text: [
                `Hello ${name || 'there'},`,
                `Thank you for contacting MedSphere about "${subject}".`,
                'Reply from our team:',
                replyText,
            ].join('\n\n'),
            html: [
                `<p>Hello ${this.escapeHtml(name || 'there')},</p>`,
                `<p>Thank you for contacting MedSphere about <strong>${this.escapeHtml(subject)}</strong>.</p>`,
                '<p><strong>Reply from our team:</strong></p>',
                `<p>${escapedReplyText}</p>`,
            ].join(''),
        });

        return {
            success: true,
            message: 'Contact reply email sent.',
        };
    }

    private async linkPatientProfileForVerifiedUser(userId: string) {
        const user = await this.userRepository.findById(userId);
        await this.linkPatientProfileForUser(user);
    }

    private async linkPatientProfileForUser(user: Pick<
        AuthUserView,
        'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'gender' | 'personalNumber'
    > | null | undefined) {
        if (!this.patientProfileLinker) {
            return;
        }
        if (!user?.personalNumber) {
            return;
        }

        await this.patientProfileLinker.linkByPersonalNumber(this.patientProfileLinkPayload(user));
    }

    private async tryLinkPatientProfileDuringRegistration(
        user: Pick<
            AuthUserView,
            'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth' | 'gender' | 'personalNumber'
        > | null | undefined,
        context: { ipAddress?: string; userAgent?: string },
    ) {
        try {
            await this.linkPatientProfileForUser(user);
        } catch (error) {
            try {
                await this.auditLogService.log({
                    userId: user?.id,
                    action: 'patient.profile.sync.failed',
                    entity: 'patient',
                    entityId: user?.id,
                    newValue: {
                        phase: 'registration',
                        reason: error instanceof Error ? error.message : 'Unknown error',
                    },
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                });
            } catch {
                return;
            }
        }
    }

    private escapeHtml(value: string) {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };

        return value.replace(/[&<>"']/g, (char) => entities[char]);
    }

    private async sendAdminCreatedUserEmail(
        user: {
            email: string;
            username?: string | null;
            firstName: string;
            lastName: string;
        },
        temporaryPassword: string,
    ) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const loginIdentifier = user.username || user.email;
        const resetUrl = env.passwordResetUrl;

        await this.emailService.send({
            to: user.email,
            subject: 'Your MedSphere account is ready',
            text: [
                `Hello ${fullName},`,
                'Your MedSphere account has been created.',
                `Username/email: ${loginIdentifier}`,
                `Temporary password: ${temporaryPassword}`,
                'This password was generated by MedSphere and was not shown to the admin.',
                'Please sign in and change this password from your profile settings.',
                `Reset password page: ${resetUrl}`,
            ].join('\n\n'),
            html: [
                `<p>Hello ${this.escapeHtml(fullName)},</p>`,
                '<p>Your MedSphere account has been created.</p>',
                `<p><strong>Username/email:</strong> ${this.escapeHtml(loginIdentifier)}</p>`,
                `<p><strong>Temporary password:</strong> ${this.escapeHtml(temporaryPassword)}</p>`,
                '<p>This password was generated by MedSphere and was not shown to the admin.</p>',
                '<p>Please sign in and change this password from your profile settings.</p>',
                `<p>Reset password page: <a href="${this.escapeHtml(resetUrl)}">${this.escapeHtml(resetUrl)}</a></p>`,
            ].join(''),
        });
    }

    private async sendProvisionedAccountEmail(
        user: {
            email: string;
            username?: string | null;
            firstName: string;
            lastName: string;
        },
        temporaryPassword: string,
        verificationToken: string,
    ) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const loginIdentifier = user.username || user.email;
        const verificationUrl = this.buildTokenUrl(env.emailVerificationUrl, verificationToken);

        await this.emailService.send({
            to: user.email,
            subject: 'Your MedSphere account is ready',
            text: [
                `Hello ${fullName},`,
                'Your MedSphere account has been created.',
                `Username/email: ${loginIdentifier}`,
                `Temporary password: ${temporaryPassword}`,
                `Confirm your email: ${verificationUrl}`,
                'This link expires in 15 minutes.',
                'After confirming your email, sign in and change this password from your profile settings.',
            ].join('\n\n'),
            html: [
                `<p>Hello ${this.escapeHtml(fullName)},</p>`,
                '<p>Your MedSphere account has been created.</p>',
                `<p><strong>Username/email:</strong> ${this.escapeHtml(loginIdentifier)}</p>`,
                `<p><strong>Temporary password:</strong> ${this.escapeHtml(temporaryPassword)}</p>`,
                `<p>Confirm your email by opening <a href="${this.escapeHtml(verificationUrl)}">this MedSphere confirmation link</a>.</p>`,
                `<p>If the link does not work, copy this URL: <br /><a href="${this.escapeHtml(verificationUrl)}">${this.escapeHtml(verificationUrl)}</a></p>`,
                '<p>This link expires in 15 minutes.</p>',
                '<p>After confirming your email, sign in and change this password from your profile settings.</p>',
            ].join(''),
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
        personalNumber: string;
        username?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const email = input.email.trim().toLowerCase();
        const username = this.normalizeUsername(input.username);
        const personalNumber = this.normalizePersonalNumber(input.personalNumber);

        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new AppError('Email already in use', 409);
        }

        if (username) {
            const existingUsername = await this.userRepository.findByUsername(username);
            if (existingUsername) {
                throw new AppError('Username already in use', 409);
            }
        }

        const existingPersonalNumber =
            await this.userRepository.findByPersonalNumber(personalNumber);
        if (existingPersonalNumber) {
            throw new AppError('Personal number already in use', 409);
        }

        this.assertPasswordComplexity(input.password);
        const passwordHash = await this.passwordService.hash(input.password);

        const user = await this.userRepository.create({
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email,
            username,
            passwordHash,
            phone: input.phone?.trim(),
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            personalNumber,
            isActive: false,
            emailVerifiedAt: null,
        });

        const patientRoles = await this.authRepository.findRolesByNames(['Patient']);
        if (patientRoles.length !== 1) {
            throw new AppError('Patient role is not configured', 500);
        }
        await this.authRepository.assignRolesToUser(user.id, [patientRoles[0].id]);
        await this.tryLinkPatientProfileDuringRegistration(user, {
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        const verification = this.createEmailVerificationToken(15);
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
                username: user.username,
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            message: 'Registration successful. Check your email for the verification link to activate the account.',
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                username: user.username,
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
        const identifier = input.email.trim().toLowerCase();
        const user = await this.authRepository.getUserAuthByIdentifier(identifier);

        if (!user) {
            await this.auditLogService.log({
                action: 'login.failed',
                entity: 'auth',
                newValue: { identifier: input.email },
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            });

            throw new AppError('Invalid credentials', 401);
        }

        if (!user.isActive) {
            await this.auditLogService.log({
                userId: user.id,
                action: 'login.failed',
                entity: 'auth',
                entityId: user.id,
                newValue: { email: user.email, reason: 'inactive_account' },
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
            });

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
            user: await this.sessionUser(user),
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
            user: await this.sessionUser(user),
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

        return this.sessionUser(user);
    }

    async getSessions(input: { userId: string; roles: string[] }) {
        if (this.canViewAllSessions(input.roles)) {
            return this.authRepository.listAllActiveSessions();
        }

        return this.authRepository.listActiveSessions(input.userId);
    }

    async getSessionLogs(input: {
        viewerUserId: string;
        roles: string[];
        page: number;
        limit: number;
        action?: string;
        userId?: string;
        userSearch?: string;
        changed?: string;
        from?: Date;
        to?: Date;
    }) {
        return this.auditLogService.listSessionLogs({
            viewerUserId: input.viewerUserId,
            canViewAll: this.canViewAllSessions(input.roles),
            page: input.page,
            limit: input.limit,
            action: input.action,
            userId: input.userId,
            userSearch: input.userSearch,
            changed: input.changed,
            from: input.from,
            to: input.to,
        });
    }

    async recordAuditLog(input: {
        userId?: string;
        action: string;
        entity: string;
        entityId?: string;
        oldValue?: unknown;
        newValue?: unknown;
        ipAddress?: string;
        userAgent?: string;
    }) {
        await this.auditLogService.log({
            userId: input.userId,
            action: input.action,
            entity: input.entity,
            entityId: input.entityId,
            oldValue: input.oldValue as any,
            newValue: input.newValue as any,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true };
    }

    async revokeSession(input: {
        userId: string;
        sessionId: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const session = await this.authRepository.findActiveSessionById(
            input.sessionId,
            input.userId,
        );

        if (!session) {
            throw new AppError('Session not found', 404);
        }

        await this.authRepository.revokeRefreshTokenById(input.sessionId, input.userId);

        await this.auditLogService.log({
            userId: input.userId,
            action: 'session.revoked',
            entity: 'refresh_token',
            entityId: input.sessionId,
            oldValue: this.sessionAuditValue(session),
            newValue: {
                status: 'revoked',
                revokedByUserId: input.userId,
            },
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
        const session = await this.authRepository.findActiveSessionById(
            input.sessionId,
        );

        if (!session) {
            throw new AppError('Session not found', 404);
        }

        await this.authRepository.revokeRefreshTokenByIdAnyUser(input.sessionId);

        await this.auditLogService.log({
            userId: input.actorUserId,
            action: 'session.revoked.admin',
            entity: 'refresh_token',
            entityId: input.sessionId,
            oldValue: this.sessionAuditValue(session),
            newValue: {
                status: 'revoked',
                revokedByUserId: input.actorUserId,
                targetUserId: session.userId,
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return { success: true };
    }

    async verifyEmail(input: {
        token?: string;
        email?: string;
        code?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        let verificationToken: any | null = null;

        if (input.email && input.code) {
            const email = input.email.trim().toLowerCase();
            const code = this.normalizeVerificationCode(input.code);
            const user = await this.userRepository.findByEmail(email);

            if (!user) {
                throw new AppError('Invalid or expired verification link or code', 400);
            }

            if (user.emailVerifiedAt) {
                return { success: true, message: 'Email is already verified.' };
            }

            verificationToken = await this.authRepository.findValidEmailVerificationToken(
                this.hashEmailVerificationCode(user.id, code),
            );
        } else if (input.token) {
            const tokenHash = this.tokenHashService.hash(input.token);
            verificationToken =
                await this.authRepository.findValidEmailVerificationToken(tokenHash);
        }

        if (!verificationToken) {
            throw new AppError('Invalid or expired verification link or code', 400);
        }

        await this.linkPatientProfileForVerifiedUser(verificationToken.userId);
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

        const verification = this.createEmailVerificationToken(15);
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
        const email = input.email.trim().toLowerCase();
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new AppError('Email is missing from our records.', 404);
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
        roles: string[];
        phone?: string;
        dateOfBirth?: Date;
        gender?: string;
        personalNumber?: string;
        username?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const email = input.email.trim().toLowerCase();
        const username = this.normalizeUsername(input.username);
        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new AppError('Email already in use', 409);
        }

        if (username) {
            const existingUsername = await this.userRepository.findByUsername(username);
            if (existingUsername) {
                throw new AppError('Username already in use', 409);
            }
        }

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

        const normalizedPersonalNumber = normalizedRoles.includes('Patient')
            ? this.normalizePersonalNumber(input.personalNumber)
            : input.personalNumber?.trim() || undefined;

        if (normalizedPersonalNumber) {
            const existingPersonalNumber =
                await this.userRepository.findByPersonalNumber(normalizedPersonalNumber);
            if (existingPersonalNumber) {
                throw new AppError('Personal number already in use', 409);
            }
        }

        const temporaryPassword = this.passwordService.generateTemporaryPassword();
        this.assertPasswordComplexity(temporaryPassword);
        const passwordHash = await this.passwordService.hash(temporaryPassword);
        const user = await this.authRepository.createUserWithRoles(
            {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                email,
                username,
                passwordHash,
                phone: input.phone?.trim(),
                dateOfBirth: input.dateOfBirth,
                gender: input.gender,
                personalNumber: normalizedPersonalNumber,
                createdBy: input.actorUserId,
            },
            roles.map((role) => role.id),
        );
        await this.sendAdminCreatedUserEmail(user, temporaryPassword);

        await this.auditLogService.log({
            userId: input.actorUserId,
            action: 'user.created.admin',
            entity: 'user',
            entityId: user.id,
            newValue: {
                email: user.email,
                username: user.username,
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

    async provisionAccount(input: {
        actorUserId?: string;
        firstName: string;
        lastName: string;
        email: string;
        roles: string[];
        phone?: string;
        dateOfBirth?: Date;
        gender?: string;
        personalNumber?: string;
        username?: string;
        ipAddress?: string;
        userAgent?: string;
    }) {
        const email = input.email.trim().toLowerCase();
        const username = this.normalizeUsername(input.username);
        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new AppError('Email already in use', 409);
        }

        if (username) {
            const existingUsername = await this.userRepository.findByUsername(username);
            if (existingUsername) {
                throw new AppError('Username already in use', 409);
            }
        }

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

        const normalizedPersonalNumber = normalizedRoles.includes('Patient')
            ? this.normalizePersonalNumber(input.personalNumber)
            : input.personalNumber?.trim() || undefined;

        if (normalizedPersonalNumber) {
            const existingPersonalNumber =
                await this.userRepository.findByPersonalNumber(normalizedPersonalNumber);
            if (existingPersonalNumber) {
                throw new AppError('Personal number already in use', 409);
            }
        }

        const temporaryPassword = this.passwordService.generateTemporaryPassword(10);
        const passwordHash = await this.passwordService.hash(temporaryPassword);
        const user = await this.authRepository.createUserWithRoles(
            {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                email,
                username,
                passwordHash,
                phone: input.phone?.trim(),
                dateOfBirth: input.dateOfBirth,
                gender: input.gender,
                personalNumber: normalizedPersonalNumber,
                isActive: false,
                emailVerifiedAt: null,
                createdBy: input.actorUserId,
            },
            roles.map((role) => role.id),
        );

        const verification = this.createEmailVerificationToken(15);
        await this.authRepository.createEmailVerificationToken({
            userId: user.id,
            tokenHash: verification.tokenHash,
            expiresAt: verification.expiresAt,
        });
        await this.sendProvisionedAccountEmail(user, temporaryPassword, verification.rawToken);

        await this.auditLogService.log({
            userId: input.actorUserId,
            action: 'user.provisioned',
            entity: 'user',
            entityId: user.id,
            newValue: {
                email: user.email,
                username: user.username,
                roles: user.roles,
            },
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        });

        return {
            message: 'User account created. A temporary password and confirmation link were sent by email.',
            user,
        };
    }
}
