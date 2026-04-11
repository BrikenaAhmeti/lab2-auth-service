import { prisma } from '../../../infrastructure/db/prisma';
import {
    CreateUserData,
    UpdateMyProfileData,
    UserRepository,
} from '../domain/user.repository';

export class UserPrismaRepository implements UserRepository {
    async create(data: CreateUserData): Promise<any> {
        return prisma.user.create({
            data,
        });
    }

    async findById(id: string): Promise<any | null> {
        return prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string): Promise<any | null> {
        return prisma.user.findUnique({
            where: { email },
        });
    }

    async updateMyProfile(userId: string, data: UpdateMyProfileData): Promise<any> {
        return prisma.user.update({
            where: { id: userId },
            data,
        });
    }
}