import { AuditLogRepository, CreateAuditLogData } from '../domain/audit-log.repository';

export class AuditLogService {
    constructor(private readonly auditLogRepository: AuditLogRepository) { }

    async log(data: CreateAuditLogData): Promise<void> {
        await this.auditLogRepository.create(data);
    }
}