import { DepartmentEntity } from './department.entity';

export interface CreateDepartmentData {
    name: string;
    description?: string;
}

export interface DepartmentRepository {
    create(data: CreateDepartmentData): Promise<DepartmentEntity>;
    findById(id: string): Promise<DepartmentEntity | null>;
    findByName(name: string): Promise<DepartmentEntity | null>;
}