import { AppError } from '../../../shared/core/errors/app-error';
import { DepartmentEntity } from '../domain/department.entity';
import { DepartmentRepository } from '../domain/department.repository';

export class DepartmentService {
    constructor(private readonly departmentRepository: DepartmentRepository) { }

    async createDepartment(data: {
        name: string;
        description?: string;
    }): Promise<DepartmentEntity> {
        const normalizedName = data.name.trim();

        const existingDepartment =
            await this.departmentRepository.findByName(normalizedName);

        if (existingDepartment) {
            throw new AppError('Department already exists', 409);
        }

        return this.departmentRepository.create({
            name: normalizedName,
            description: data.description?.trim(),
        });
    }

    async getDepartmentById(id: string): Promise<DepartmentEntity> {
        const department = await this.departmentRepository.findById(id);

        if (!department) {
            throw new AppError('Department not found', 404);
        }

        return department;
    }
}