import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { UserPrismaRepository } from '../../users/infrastructure/user.prisma.repository';
import { AuthPrismaRepository } from '../infrastructure/auth.prisma.repository';
import { AuditLogPrismaRepository } from '../../audit-logs/infrastructure/audit-log.prisma.repository';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { PasswordService } from '../../../shared/services/password.service';
import { JwtService } from '../../../shared/services/jwt.service';
import { TokenHashService } from '../../../shared/services/token-hash.service';
import { createEmailService } from '../../../shared/services/email.service';
import { CorePatientClient } from '../infrastructure/core-patient.client';

const usernameSchema = z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9._-]+$/)
    .optional();

const platformSchema = z.enum(['web', 'mobile']).optional();

const registerSchema = z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    email: z.email(),
    username: usernameSchema,
    password: z.string().min(12).max(100),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    personalNumber: z.string().trim().min(1).max(50),
    platform: platformSchema,
});

const loginSchema = z.object({
    email: z.string().trim().min(1).max(254),
    password: z.string().min(1),
});

const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

const verifyEmailSchema = z
    .object({
        token: z.string().trim().min(1).optional(),
        email: z.email().optional(),
        code: z.string().trim().regex(/^\d{6}$/).optional(),
    })
    .refine((value) => Boolean(value.token || value.code || (value.email && value.code)), {
        message: 'Provide either token or verification code',
        path: ['code'],
    });

const verifyEmailQuerySchema = z.object({
    token: z.string().min(1),
});

const resendVerificationSchema = z.object({
    email: z.email(),
    platform: platformSchema,
});

const forgotPasswordSchema = z.object({
    email: z.email(),
    platform: platformSchema,
});

const resetPasswordSchema = z
    .object({
        token: z.string().trim().min(1).optional(),
        code: z.string().trim().min(1).optional(),
        email: z.email().optional(),
        newPassword: z.string().min(12).max(100).optional(),
        password: z.string().min(12).max(100).optional(),
    })
    .refine((value) => Boolean(value.token || value.code), {
        message: 'Provide either token or reset code',
        path: ['code'],
    })
    .refine((value) => Boolean(value.newPassword || value.password), {
        message: 'Password is required',
        path: ['password'],
    });

const logoutSchema = z.object({
    refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(100),
});

const createAdminUserSchema = z.object({
    firstName: z.string().min(2).max(100),
    lastName: z.string().min(2).max(100),
    email: z.email(),
    username: usernameSchema,
    roles: z.array(z.string().min(1)).min(1),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    personalNumber: z.string().trim().min(1).max(50).optional(),
});

const provisionAccountSchema = createAdminUserSchema.extend({
    actorUserId: z.string().trim().min(1).optional(),
});

const contactAcknowledgementSchema = z.object({
    name: z.string().trim().min(1).max(200),
    email: z.email(),
    subject: z.string().trim().min(1).max(200),
});

const contactReplySchema = contactAcknowledgementSchema.extend({
    replyText: z.string().trim().min(1).max(2000),
});

const sessionLogsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    action: z.string().trim().optional(),
    userId: z.string().trim().optional(),
    userSearch: z.string().trim().optional(),
    changed: z.string().trim().optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
});

const optionalAuditTextSchema = (max: number) =>
    z.string().trim().min(1).max(max).optional().nullable();

const internalAuditLogSchema = z
    .object({
        userId: optionalAuditTextSchema(120),
        action: z.string().trim().min(1).max(120),
        entity: z.string().trim().min(1).max(120),
        entityId: optionalAuditTextSchema(200),
        oldValue: z.unknown().optional(),
        newValue: z.unknown().optional(),
        ipAddress: optionalAuditTextSchema(120),
        userAgent: optionalAuditTextSchema(1000),
    })
    .strict();

function parseQueryDate(value?: string) {
    if (!value) return undefined;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizePlatform(value: unknown) {
    const rawValue = Array.isArray(value) ? value[0] : value;

    if (typeof rawValue !== 'string') {
        return undefined;
    }

    const normalized = rawValue.trim().toLowerCase();
    return normalized === 'mobile' || normalized === 'web' ? normalized : undefined;
}

function resolveClientPlatform(req: Request, bodyPlatform?: 'web' | 'mobile') {
    return (
        bodyPlatform ??
        normalizePlatform(req.query.platform) ??
        normalizePlatform(req.headers['x-client-platform'])
    );
}

export class AuthController {
    private readonly service = new AuthService(
        new UserPrismaRepository(),
        new AuthPrismaRepository(),
        new PasswordService(),
        new JwtService(),
        new TokenHashService(),
        new AuditLogService(new AuditLogPrismaRepository()),
        createEmailService(),
        new CorePatientClient(),
    );

    async register(req: Request, res: Response) {
        const body = registerSchema.parse(req.body);

        const result = await this.service.registerPatient({
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            username: body.username,
            password: body.password,
            phone: body.phone,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
            gender: body.gender,
            personalNumber: body.personalNumber,
            platform: body.platform,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(201).json(result);
    }

    async login(req: Request, res: Response) {
        const body = loginSchema.parse(req.body);

        const result = await this.service.login({
            email: body.email,
            password: body.password,
            deviceInfo: req.headers['user-agent'],
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async refresh(req: Request, res: Response) {
        const body = refreshSchema.parse(req.body);

        const result = await this.service.refresh({
            refreshToken: body.refreshToken,
            deviceInfo: req.headers['user-agent'],
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async verifyEmail(req: Request, res: Response) {
        const body = verifyEmailSchema.parse(req.body);

        const result = await this.service.verifyEmail({
            token: body.token,
            email: body.email,
            code: body.code,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async verifyEmailLink(req: Request, res: Response) {
        const query = verifyEmailQuerySchema.parse(req.query);

        const result = await this.service.verifyEmail({
            token: query.token,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async resendVerification(req: Request, res: Response) {
        const body = resendVerificationSchema.parse(req.body);

        const result = await this.service.resendVerificationEmail({
            email: body.email,
            platform: resolveClientPlatform(req, body.platform),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async sendContactAcknowledgement(req: Request, res: Response) {
        const body = contactAcknowledgementSchema.parse(req.body);
        const result = await this.service.sendContactAcknowledgementEmail(body);

        return res.status(200).json(result);
    }

    async sendContactReply(req: Request, res: Response) {
        const body = contactReplySchema.parse(req.body);
        const result = await this.service.sendContactReplyEmail(body);

        return res.status(200).json(result);
    }

    async forgotPassword(req: Request, res: Response) {
        const body = forgotPasswordSchema.parse(req.body);

        const result = await this.service.requestPasswordReset({
            email: body.email,
            platform: resolveClientPlatform(req, body.platform),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async resetPassword(req: Request, res: Response) {
        const body = resetPasswordSchema.parse(req.body);

        const result = await this.service.resetPassword({
            token: body.token,
            code: body.code,
            email: body.email,
            newPassword: body.newPassword ?? body.password!,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async logout(req: Request, res: Response) {
        const body = logoutSchema.parse(req.body);

        const result = await this.service.logout({
            refreshToken: body.refreshToken,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async me(req: Request, res: Response) {
        const result = await this.service.me(req.user!.id);
        return res.status(200).json(result);
    }

    async sessions(req: Request, res: Response) {
        const result = await this.service.getSessions({
            userId: req.user!.id,
            roles: req.user!.roles,
        });
        return res.status(200).json(result);
    }

    async sessionLogs(req: Request, res: Response) {
        const query = sessionLogsQuerySchema.parse(req.query);
        const result = await this.service.getSessionLogs({
            viewerUserId: req.user!.id,
            roles: req.user!.roles,
            page: query.page,
            limit: query.limit,
            action: query.action,
            userId: query.userId,
            userSearch: query.userSearch,
            changed: query.changed,
            from: parseQueryDate(query.from),
            to: parseQueryDate(query.to),
        });

        return res.status(200).json(result);
    }

    async recordAuditLog(req: Request, res: Response) {
        const body = internalAuditLogSchema.parse(req.body);
        const result = await this.service.recordAuditLog({
            userId: body.userId ?? undefined,
            action: body.action,
            entity: body.entity,
            entityId: body.entityId ?? undefined,
            oldValue: body.oldValue,
            newValue: body.newValue,
            ipAddress: body.ipAddress ?? undefined,
            userAgent: body.userAgent ?? undefined,
        });

        return res.status(201).json(result);
    }

    async revokeSession(req: Request<{ id: string }>, res: Response) {
        const result = await this.service.revokeSession({
            userId: req.user!.id,
            sessionId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async revokeSessionAsAdmin(req: Request<{ id: string }>, res: Response) {
        const result = await this.service.revokeSessionAsAdmin({
            actorUserId: req.user!.id,
            sessionId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async changePassword(req: Request, res: Response) {
        const body = changePasswordSchema.parse(req.body);

        const result = await this.service.changePassword({
            userId: req.user!.id,
            currentPassword: body.currentPassword,
            newPassword: body.newPassword,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }

    async createAdminUser(req: Request, res: Response) {
        const body = createAdminUserSchema.parse(req.body);

        const result = await this.service.createAdminUser({
            actorUserId: req.user!.id,
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            username: body.username,
            roles: body.roles,
            phone: body.phone,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
            gender: body.gender,
            personalNumber: body.personalNumber,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(201).json(result);
    }

    async provisionAccount(req: Request, res: Response) {
        const body = provisionAccountSchema.parse(req.body);

        const result = await this.service.provisionAccount({
            actorUserId: body.actorUserId,
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            username: body.username,
            roles: body.roles,
            phone: body.phone,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
            gender: body.gender,
            personalNumber: body.personalNumber,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(201).json(result);
    }
}
