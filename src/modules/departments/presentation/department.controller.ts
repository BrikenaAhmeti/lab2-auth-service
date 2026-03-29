import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { DepartmentPrismaRepository } from '../infrastructure/department.prisma.repository';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentCommand } from '../application/commands/create-department.command';
import { CreateDepartmentHandler } from '../application/handlers/create-department.handler';
import { GetDepartmentByIdQuery } from '../application/queries/get-department-by-id.query';
import { GetDepartmentByIdHandler } from '../application/handlers/get-department-by-id.handler';

const createDepartmentSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(255).optional(),
});

export class DepartmentController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly repository = new DepartmentPrismaRepository();
    private readonly service = new DepartmentService(this.repository);

    async create(req: Request, res: Response) {
        const body = createDepartmentSchema.parse(req.body);

        const handler = new CreateDepartmentHandler(this.service);
        const command = new CreateDepartmentCommand(body.name, body.description);

        const result = await this.commandBus.execute(handler, command);

        return res.status(201).json(result);
    }

    async getById(req: Request<{ id: string }>, res: Response) {
        const handler = new GetDepartmentByIdHandler(this.service);
        const query = new GetDepartmentByIdQuery(req.params.id);

        const result = await this.queryBus.execute(handler, query);

        return res.status(200).json(result);
    }
}