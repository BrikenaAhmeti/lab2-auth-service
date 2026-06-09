import { AppError } from '../../../shared/core/errors/app-error';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { UserRepository } from '../domain/user.repository';

export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly auditLogService: AuditLogService,
    ) { }

    private toPublicProfile(user: any) {
        const { passwordHash, personalNumber, ...publicProfile } = user;
        return publicProfile;
    }

    private toOwnProfile(user: any) {
        const { passwordHash, ...ownProfile } = user;
        return ownProfile;
    }

    private toInternalProfile(user: any) {
        const roles = (user.userRoles ?? [])
            .map((entry: any) => entry.role?.name)
            .filter(Boolean);
        const [primaryRole] = roles;

        return {
            id: user.id,
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            phone: user.phone,
            avatarFileId: user.avatarFileId,
            roles,
            role: primaryRole ? primaryRole.toLowerCase().replace(/\s+/g, '_') : undefined,
        };
    }

    async getCurrentUser(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return this.toOwnProfile(user);
    }

    async getDoctors() {
        return this.userRepository.findDoctors();
    }

    async getInternalProfiles(userIds: string[]) {
        const uniqueIds = [...new Set(userIds)];

        if (uniqueIds.length === 0) {
            return [];
        }

        const users = await this.userRepository.findByIds(uniqueIds);
        const usersById = new Map(users.map((user) => [user.id, user]));

        return uniqueIds
            .map((id) => usersById.get(id))
            .filter(Boolean)
            .map((user) => this.toInternalProfile(user));
    }

    async updateMyProfile(
        userId: string,
        data: {
            firstName?: string;
            lastName?: string;
            phone?: string | null;
            dateOfBirth?: Date | null;
            gender?: string | null;
            avatarFileId?: string | null;
            avatarUrl?: string | null;
            ipAddress?: string;
            userAgent?: string;
        },
    ) {
        const existing = await this.userRepository.findById(userId);

        if (!existing) {
            throw new AppError('User not found', 404);
        }

        const updated = await this.userRepository.updateMyProfile(userId, {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            avatarFileId: data.avatarFileId,
            avatarUrl: data.avatarUrl,
            updatedBy: userId,
        });

        await this.auditLogService.log({
            userId,
            action: 'user.updated',
            entity: 'user',
            entityId: userId,
            oldValue: {
                firstName: existing.firstName,
                lastName: existing.lastName,
                phone: existing.phone,
                dateOfBirth: existing.dateOfBirth,
                gender: existing.gender,
                avatarFileId: existing.avatarFileId,
                avatarUrl: existing.avatarUrl,
            },
            newValue: {
                firstName: updated.firstName,
                lastName: updated.lastName,
                phone: updated.phone,
                dateOfBirth: updated.dateOfBirth,
                gender: updated.gender,
                avatarFileId: updated.avatarFileId,
                avatarUrl: updated.avatarUrl,
            },
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
        });

        return this.toOwnProfile(updated);
    }
}
