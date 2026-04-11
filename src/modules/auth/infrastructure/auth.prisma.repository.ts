import { prisma } from '../../../infrastructure/db/prisma';
import {
    AuthRepository,
    CreateOneTimeTokenData,
    AuthUserView,
    CreateRefreshTokenData,
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
        passwordHash: user.passwordHash,
        isActive: user.isActive,
        roles: user.userRoles.map((x: any) => x.role.name),
        permissions: Array.from(permissions),
    };
}

export class AuthPrismaRepository implements AuthRepository {
    async getUserAuthByEmail(email: string): Promise<AuthUserView | null> {
        const user = await prisma.user.findUnique({
            where: { email },
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

    async listActiveSessions(userId: string): Promise<any[]> {
        return prisma.refreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                deviceInfo: true,
                ipAddress: true,
                expiresAt: true,
                lastUsedAt: true,
                createdAt: true,
            },
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
}
