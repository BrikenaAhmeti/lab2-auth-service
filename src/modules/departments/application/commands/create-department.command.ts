import { Command } from '../../../../shared/core/buses/command-bus';

export class CreateDepartmentCommand implements Command {
    constructor(
        public readonly name: string,
        public readonly description?: string,
    ) { }
}