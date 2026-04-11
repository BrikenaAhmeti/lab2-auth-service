import { Prisma } from '../../../generated/prisma';

export interface CreateAuditLogData {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    newValue?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    ipAddress?: string;
    userAgent?: string;
}

export interface AuditLogRepository {
    create(data: CreateAuditLogData): Promise<void>;
}