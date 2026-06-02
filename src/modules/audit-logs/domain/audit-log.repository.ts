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

export interface AuditLogUserView {
    id: string;
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
}

export interface SessionAuditLogView {
    id: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
    actor: AuditLogUserView | null;
}

export interface SessionAuditLogFilters {
    viewerUserId: string;
    canViewAll: boolean;
    page: number;
    limit: number;
    action?: string;
    userId?: string;
    userSearch?: string;
    changed?: string;
    from?: Date;
    to?: Date;
}

export interface SessionAuditLogListResult {
    items: SessionAuditLogView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AuditLogRepository {
    create(data: CreateAuditLogData): Promise<void>;
    listSessionLogs(filters: SessionAuditLogFilters): Promise<SessionAuditLogListResult>;
}
