import { prisma } from '../../../infrastructure/db/prisma';
import {
    AuditLogRepository,
    SessionAuditLogFilters,
    SessionAuditLogListResult,
    CreateAuditLogData,
} from '../domain/audit-log.repository';

function stringifyForSearch(value: unknown) {
    if (value === null || value === undefined) {
        return '';
    }

    try {
        return JSON.stringify(value).toLowerCase();
    } catch {
        return String(value).toLowerCase();
    }
}

function matchesChangedFilter(log: {
    action: string;
    entity: string;
    entityId: string | null;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string | null;
    userAgent: string | null;
}, changed: string) {
    const needle = changed.trim().toLowerCase();
    if (!needle) return true;

    return [
        log.action,
        log.entity,
        log.entityId,
        log.ipAddress,
        log.userAgent,
        stringifyForSearch(log.oldValue),
        stringifyForSearch(log.newValue),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
}

export class AuditLogPrismaRepository implements AuditLogRepository {
    async create(data: CreateAuditLogData): Promise<void> {
        await prisma.auditLog.create({
            data,
        });
    }

    async listSessionLogs(
        filters: SessionAuditLogFilters,
    ): Promise<SessionAuditLogListResult> {
        const page = Math.max(1, filters.page);
        const limit = Math.min(Math.max(1, filters.limit), 100);
        const userIds = new Set<string>();

        if (filters.canViewAll) {
            if (filters.userId) {
                userIds.add(filters.userId);
            }
        } else {
            userIds.add(filters.viewerUserId);
        }

        if (filters.userSearch?.trim()) {
            const search = filters.userSearch.trim();
            const matchedUsers = await prisma.user.findMany({
                where: {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { username: { contains: search, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                },
            });
            const matchedIds = new Set(matchedUsers.map((user) => user.id));

            if (userIds.size > 0) {
                for (const id of [...userIds]) {
                    if (!matchedIds.has(id)) {
                        userIds.delete(id);
                    }
                }
            } else {
                matchedIds.forEach((id) => userIds.add(id));
            }

            if (userIds.size === 0) {
                return {
                    items: [],
                    meta: { page, limit, total: 0, totalPages: 0 },
                };
            }
        }

        const where = {
            ...(filters.action ? { action: filters.action } : {}),
            ...(userIds.size > 0 ? { userId: { in: [...userIds] } } : {}),
            ...(filters.from || filters.to
                ? {
                    createdAt: {
                        ...(filters.from ? { gte: filters.from } : {}),
                        ...(filters.to ? { lte: filters.to } : {}),
                    },
                }
                : {}),
        };

        const rows = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        const filteredRows = filters.changed
            ? rows.filter((log) => matchesChangedFilter(log, filters.changed!))
            : rows;
        const total = filteredRows.length;
        const pageRows = filteredRows.slice((page - 1) * limit, page * limit);
        const actorIds = [
            ...new Set(
                pageRows
                    .map((log) => log.userId)
                    .filter((userId): userId is string => Boolean(userId)),
            ),
        ];
        const actors = await prisma.user.findMany({
            where: {
                id: { in: actorIds },
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
            },
        });
        const actorsById = new Map(actors.map((actor) => [actor.id, actor]));

        return {
            items: pageRows.map((log) => ({
                id: log.id,
                userId: log.userId,
                action: log.action,
                entity: log.entity,
                entityId: log.entityId,
                oldValue: log.oldValue,
                newValue: log.newValue,
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                createdAt: log.createdAt,
                actor: log.userId ? actorsById.get(log.userId) ?? null : null,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
