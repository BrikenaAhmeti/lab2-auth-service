import { Query } from '../../../../shared/core/buses/query-bus';

export class GetDepartmentByIdQuery implements Query {
    constructor(public readonly id: string) { }
}