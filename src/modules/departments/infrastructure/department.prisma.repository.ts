import { prisma } from '../../../infrastructure/db/prisma';
import {
    CreateDepartmentData,
    DepartmentRepository,
} from '../domain/department.repository';
import { DepartmentEntity } from '../domain/department.entity';

export class DepartmentPrismaRepository implements DepartmentRepository {
    async create(data: CreateDepartmentData): Promise<DepartmentEntity> {
        return prisma.department.create({
            data: {
                name: data.name,
                description: data.description,
            },
        });
    }

    async findById(id: string): Promise<DepartmentEntity | null> {
        return prisma.department.findUnique({
            where: { id },
        });
    }

    async findByName(name: string): Promise<DepartmentEntity | null> {
        return prisma.department.findUnique({
            where: { name },
        });
    }
}