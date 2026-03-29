import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { DepartmentEntity } from '../../domain/department.entity';
import { DepartmentService } from '../../services/department.service';
import { GetDepartmentByIdQuery } from '../queries/get-department-by-id.query';

export class GetDepartmentByIdHandler
    implements QueryHandler<GetDepartmentByIdQuery, DepartmentEntity> {
    constructor(private readonly departmentService: DepartmentService) { }

    async execute(query: GetDepartmentByIdQuery): Promise<DepartmentEntity> {
        return this.departmentService.getDepartmentById(query.id);
    }
}