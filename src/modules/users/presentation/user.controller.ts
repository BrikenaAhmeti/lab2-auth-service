import { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service';
import { UserPrismaRepository } from '../infrastructure/user.prisma.repository';
import { AuditLogPrismaRepository } from '../../audit-logs/infrastructure/audit-log.prisma.repository';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';

const updateMeSchema = z.object({
    firstName: z.string().min(2).max(100).optional(),
    lastName: z.string().min(2).max(100).optional(),
    phone: z.string().nullable().optional(),
    dateOfBirth: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    avatarFileId: z.string().nullable().optional(),
    avatarUrl: z.string().trim().max(2000).nullable().optional(),
});

const internalProfilesSchema = z.object({
    userIds: z.array(z.string().uuid('Invalid user id')).max(100),
});

const internalProfilesSchema = z.object({
    userIds: z.array(z.string().uuid('Invalid user id')).max(100),
});

export class UserController {
    private readonly service = new UserService(
        new UserPrismaRepository(),
        new AuditLogService(new AuditLogPrismaRepository()),
    );

    async me(req: Request, res: Response) {
        const result = await this.service.getCurrentUser(req.user!.id);
        return res.status(200).json(result);
    }

    async getDoctors(req: Request, res: Response) {
        const result = await this.service.getDoctors();
        return res.status(200).json(result);
    }

    async internalProfiles(req: Request, res: Response) {
        const body = internalProfilesSchema.parse(req.body);
        const result = await this.service.getInternalProfiles(body.userIds);

        return res.status(200).json({ data: result });
    }

    async updateMe(req: Request, res: Response) {
        const body = updateMeSchema.parse(req.body);

        const result = await this.service.updateMyProfile(req.user!.id, {
            firstName: body.firstName,
            lastName: body.lastName,
            phone: body.phone,
            dateOfBirth:
                body.dateOfBirth === null
                    ? null
                    : body.dateOfBirth
                        ? new Date(body.dateOfBirth)
                        : undefined,
            gender: body.gender,
            avatarFileId: body.avatarFileId,
            avatarUrl: body.avatarUrl,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        return res.status(200).json(result);
    }
}
