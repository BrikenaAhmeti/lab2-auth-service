import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { DepartmentEntity } from '../../domain/department.entity';
import { DepartmentService } from '../../services/department.service';
import { CreateDepartmentCommand } from '../commands/create-department.command';

export class CreateDepartmentHandler
    implements CommandHandler<CreateDepartmentCommand, DepartmentEntity> {
    constructor(private readonly departmentService: DepartmentService) { }

    async execute(command: CreateDepartmentCommand): Promise<DepartmentEntity> {
        return this.departmentService.createDepartment({
            name: command.name,
            description: command.description,
        });
    }
}