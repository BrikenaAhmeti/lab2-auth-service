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

    async findByUsername(username: string): Promise<any | null> {
        return prisma.user.findUnique({
            where: { username },
        });
    }

    async findByPersonalNumber(personalNumber: string): Promise<any | null> {
        return prisma.user.findUnique({
            where: { personalNumber },
        });
    }

    async findDoctors(): Promise<any[]> {
        return prisma.user.findMany({
            where: {
                isActive: true,
                userRoles: {
                    some: {
                        role: {
                            name: 'Doctor',
                        },
                    },
                },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true,
                phone: true,
                avatarFileId: true,
            },
        });
    }

    async updateMyProfile(userId: string, data: UpdateMyProfileData): Promise<any> {
        return prisma.user.update({
            where: { id: userId },
            data,
        });
    }
}
