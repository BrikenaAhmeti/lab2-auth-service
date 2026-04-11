import { prisma } from '../../../infrastructure/db/prisma';
import {
    AuditLogRepository,
    CreateAuditLogData,
} from '../domain/audit-log.repository';

export class AuditLogPrismaRepository implements AuditLogRepository {
    async create(data: CreateAuditLogData): Promise<void> {
        await prisma.auditLog.create({
            data,
        });
    }
}