import { UserRepository } from '../../src/modules/users/domain/user.repository';
import { UserService } from '../../src/modules/users/services/user.service';

function createMocks() {
    const userRepository: jest.Mocked<UserRepository> = {
        create: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByUsername: jest.fn(),
        findDoctors: jest.fn(),
        updateMyProfile: jest.fn(),
    };

    const auditLogService = {
        log: jest.fn(),
    };

    return { userRepository, auditLogService };
}

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not expose password hash or personal number in current profile', async () => {
        const m = createMocks();
        const service = new UserService(m.userRepository, m.auditLogService as any);

        m.userRepository.findById.mockResolvedValue({
            id: 'u1',
            email: 'patient@medsphere.local',
            firstName: 'Arta',
            lastName: 'Patient',
            passwordHash: 'hashed-password',
            personalNumber: '1234567890',
            isActive: true,
        });

        const result = await service.getCurrentUser('u1');

        expect(result).toMatchObject({
            id: 'u1',
            email: 'patient@medsphere.local',
            firstName: 'Arta',
            lastName: 'Patient',
            isActive: true,
        });
        expect(result).not.toHaveProperty('passwordHash');
        expect(result).not.toHaveProperty('personalNumber');
    });

    it('does not expose password hash or personal number after profile update', async () => {
        const m = createMocks();
        const service = new UserService(m.userRepository, m.auditLogService as any);

        m.userRepository.findById.mockResolvedValue({
            id: 'u1',
            firstName: 'Arta',
            lastName: 'Patient',
            passwordHash: 'old-hash',
            personalNumber: '1234567890',
        });
        m.userRepository.updateMyProfile.mockResolvedValue({
            id: 'u1',
            firstName: 'Arta',
            lastName: 'Updated',
            passwordHash: 'new-hash',
            personalNumber: '1234567890',
        });

        const result = await service.updateMyProfile('u1', {
            lastName: 'Updated',
        });

        expect(result).toMatchObject({
            id: 'u1',
            firstName: 'Arta',
            lastName: 'Updated',
        });
        expect(result).not.toHaveProperty('passwordHash');
        expect(result).not.toHaveProperty('personalNumber');
    });
});
