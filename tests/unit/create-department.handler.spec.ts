import { CreateDepartmentHandler } from '../../src/modules/departments/application/handlers/create-department.handler';
import { CreateDepartmentCommand } from '../../src/modules/departments/application/commands/create-department.command';
import { DepartmentRepository } from '../../src/modules/departments/domain/department.repository';
import { AppError } from '../../src/shared/core/errors/app-error';

describe('CreateDepartmentHandler', () => {
    const repository: jest.Mocked<DepartmentRepository> = {
        create: jest.fn(),
        findById: jest.fn(),
        findByName: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a department when name is unique', async () => {
        repository.findByName.mockResolvedValue(null);
        repository.create.mockResolvedValue({
            id: '1',
            name: 'Cardiology',
            description: 'Heart department',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const handler = new CreateDepartmentHandler(repository);
        const command = new CreateDepartmentCommand('Cardiology', 'Heart department');

        const result = await handler.execute(command);

        expect(repository.findByName).toHaveBeenCalledWith('Cardiology');
        expect(repository.create).toHaveBeenCalledWith({
            name: 'Cardiology',
            description: 'Heart department',
        });
        expect(result.name).toBe('Cardiology');
    });

    it('should throw when department already exists', async () => {
        repository.findByName.mockResolvedValue({
            id: '1',
            name: 'Cardiology',
            description: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const handler = new CreateDepartmentHandler(repository);
        const command = new CreateDepartmentCommand('Cardiology');

        await expect(handler.execute(command)).rejects.toBeInstanceOf(AppError);
        expect(repository.create).not.toHaveBeenCalled();
    });
});