import { prisma } from '../../../infrastructure/db/prisma';
import {
    AuthRepository,
    CreateOneTimeTokenData,
    CreateAdminUserData,
    AuthUserView,
    CreateRefreshTokenData,
    ActiveSessionView,
} from '../domain/auth.repository';

function mapAuthUser(user: any): AuthUserView {
    const permissions = new Set<string>();

    for (const userRole of user.userRoles) {
        for (const rolePermission of userRole.role.rolePermissions) {
            const permissionName = rolePermission.permission.name;
            permissions.add(permissionName);

            if (rolePermission.scope) {
                permissions.add(`${permissionName}:${rolePermission.scope}`);
            }
        }
    }

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
        roles: user.userRoles.map((x: any) => x.role.name),
        permissions: Array.from(permissions),
    };
}

export class AuthPrismaRepository implements AuthRepository {
    async getUserAuthByIdentifier(identifier: string): Promise<AuthUserView | null> {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                ],
            },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return user ? mapAuthUser(user) : null;
    }

    async getUserAuthById(id: string): Promise<AuthUserView | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return user ? mapAuthUser(user) : null;
    }

    async createRefreshToken(data: CreateRefreshTokenData): Promise<void> {
        await prisma.refreshToken.create({ data });
    }

    async findValidRefreshToken(tokenHash: string): Promise<any | null> {
        return prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });
    }

    async revokeRefreshToken(tokenHash: string): Promise<number> {
        const result = await prisma.refreshToken.updateMany({
            where: {
                tokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        return result.count;
    }

    async revokeRefreshTokenById(id: string, userId: string): Promise<boolean> {
        const result = await prisma.refreshToken.updateMany({
            where: {
                id,
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        return result.count > 0;
    }

    async revokeRefreshTokenByIdAnyUser(id: string): Promise<boolean> {
        const result = await prisma.refreshToken.updateMany({
            where: {
                id,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        return result.count > 0;
    }

    async revokeAllRefreshTokensByUser(userId: string): Promise<number> {
        const result = await prisma.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        return result.count;
    }

    async touchRefreshToken(tokenHash: string): Promise<void> {
        await prisma.refreshToken.updateMany({
            where: {
                tokenHash,
                revokedAt: null,
            },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }

    private activeSessionSelect() {
        return {
            id: true,
            userId: true,
            deviceInfo: true,
            ipAddress: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                },
            },
        } as const;
    }

    async listActiveSessions(userId: string): Promise<ActiveSessionView[]> {
        return prisma.refreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: this.activeSessionSelect(),
        });
    }

    async listAllActiveSessions(): Promise<ActiveSessionView[]> {
        return prisma.refreshToken.findMany({
            where: {
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: this.activeSessionSelect(),
        });
    }

    async findActiveSessionById(
        id: string,
        userId?: string,
    ): Promise<ActiveSessionView | null> {
        return prisma.refreshToken.findFirst({
            where: {
                id,
                ...(userId ? { userId } : {}),
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            select: this.activeSessionSelect(),
        });
    }

    async createEmailVerificationToken(data: CreateOneTimeTokenData): Promise<void> {
        await prisma.emailVerificationToken.create({ data });
    }

    async invalidateEmailVerificationTokens(userId: string): Promise<void> {
        await prisma.emailVerificationToken.updateMany({
            where: {
                userId,
                usedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
            data: {
                usedAt: new Date(),
            },
        });
    }

    async findValidEmailVerificationToken(tokenHash: string): Promise<any | null> {
        return prisma.emailVerificationToken.findFirst({
            where: {
                tokenHash,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    async markEmailVerificationTokenUsed(id: string): Promise<void> {
        await prisma.emailVerificationToken.updateMany({
            where: {
                id,
                usedAt: null,
            },
            data: {
                usedAt: new Date(),
            },
        });
    }

    async markUserEmailVerified(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerifiedAt: new Date(),
                isActive: true,
            },
        });
    }

    async createPasswordResetToken(data: CreateOneTimeTokenData): Promise<void> {
        await prisma.passwordResetToken.create({ data });
    }

    async invalidatePasswordResetTokens(userId: string): Promise<void> {
        await prisma.passwordResetToken.updateMany({
            where: {
                userId,
                usedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
            data: {
                usedAt: new Date(),
            },
        });
    }

    async findValidPasswordResetToken(tokenHash: string): Promise<any | null> {
        return prisma.passwordResetToken.findFirst({
            where: {
                tokenHash,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    async markPasswordResetTokenUsed(id: string): Promise<void> {
        await prisma.passwordResetToken.updateMany({
            where: {
                id,
                usedAt: null,
            },
            data: {
                usedAt: new Date(),
            },
        });
    }

    async updateUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
            },
        });
    }

    async findRolesByNames(names: string[]): Promise<Array<{ id: string; name: string }>> {
        return prisma.role.findMany({
            where: {
                name: {
                    in: names,
                },
            },
            select: {
                id: true,
                name: true,
            },
        });
    }

    async createUserWithRoles(
        data: CreateAdminUserData,
        roleIds: string[],
    ): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        roles: string[];
    }> {
        const created = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    username: data.username,
                    passwordHash: data.passwordHash,
                    phone: data.phone,
                    dateOfBirth: data.dateOfBirth,
                    gender: data.gender,
                    personalNumber: data.personalNumber,
                    isActive: data.isActive ?? true,
                    emailVerifiedAt: data.emailVerifiedAt === undefined ? new Date() : data.emailVerifiedAt,
                    createdBy: data.createdBy,
                    updatedBy: data.createdBy,
                },
            });

            await tx.userRole.createMany({
                data: roleIds.map((roleId) => ({
                    userId: user.id,
                    roleId,
                    createdBy: data.createdBy,
                    updatedBy: data.createdBy,
                })),
            });

            const roles = await tx.role.findMany({
                where: {
                    id: {
                        in: roleIds,
                    },
                },
                select: {
                    name: true,
                },
            });

            return {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive,
                roles: roles.map((role) => role.name),
            };
        });

        return created;
    }

    async assignRolesToUser(
        userId: string,
        roleIds: string[],
        actorUserId?: string,
    ): Promise<void> {
        if (roleIds.length === 0) {
            return;
        }

        await prisma.userRole.createMany({
            data: roleIds.map((roleId) => ({
                userId,
                roleId,
                createdBy: actorUserId,
                updatedBy: actorUserId,
            })),
            skipDuplicates: true,
        });
    }
}
