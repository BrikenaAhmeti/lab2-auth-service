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

    async getCurrentUser(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return this.toPublicProfile(user);
    }

    async getDoctors() {
        return this.userRepository.findDoctors();
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

        return this.toPublicProfile(updated);
    }
}
