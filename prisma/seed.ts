import bcrypt from 'bcrypt';
import { prisma } from '../src/infrastructure/db/prisma';

const DEMO_USER_IDS = {
    admin: process.env.AUTH_DEMO_ADMIN_USER_ID ?? '11111111-1111-4111-8111-111111111111',
    clinicAdmin:
        process.env.AUTH_DEMO_CLINIC_ADMIN_USER_ID ?? '11111111-1111-4111-8111-111111111112',
    doctor: process.env.AUTH_DEMO_DOCTOR_USER_ID ?? '22222222-2222-4222-8222-222222222222',
    cardiologist:
        process.env.AUTH_DEMO_CARDIOLOGIST_USER_ID ?? '22222222-2222-4222-8222-222222222223',
    pediatrician:
        process.env.AUTH_DEMO_PEDIATRICIAN_USER_ID ?? '22222222-2222-4222-8222-222222222224',
    nurse: process.env.AUTH_DEMO_NURSE_USER_ID ?? '33333333-3333-4333-8333-333333333333',
    emergencyNurse:
        process.env.AUTH_DEMO_EMERGENCY_NURSE_USER_ID ?? '33333333-3333-4333-8333-333333333334',
    receptionist:
        process.env.AUTH_DEMO_RECEPTIONIST_USER_ID ?? '44444444-4444-4444-8444-444444444444',
    labTechnician:
        process.env.AUTH_DEMO_LAB_TECHNICIAN_USER_ID ?? '88888888-8888-4888-8888-888888888888',
    pharmacist:
        process.env.AUTH_DEMO_PHARMACIST_USER_ID ?? '99999999-9999-4999-8999-999999999999',
    patient: process.env.AUTH_DEMO_PATIENT_USER_ID ?? '55555555-5555-4555-8555-555555555555',
    patientSamir:
        process.env.AUTH_DEMO_PATIENT_SAMIR_USER_ID ?? '55555555-5555-4555-8555-555555555556',
    patientLina:
        process.env.AUTH_DEMO_PATIENT_LINA_USER_ID ?? '55555555-5555-4555-8555-555555555557',
} as const;

const DEMO_PASSWORD = 'Medsphere@123';

const DEMO_USERS = [
    {
        id: DEMO_USER_IDS.admin,
        firstName: 'Mira',
        lastName: 'Krasniqi',
        email: 'admin@medsphere.local',
        username: 'admin',
        password: DEMO_PASSWORD,
        role: 'Super Admin',
        phone: '+383 44 100 001',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.clinicAdmin,
        firstName: 'Daniel',
        lastName: 'Okafor',
        email: 'clinic.admin@medsphere.local',
        username: 'clinic-admin',
        password: DEMO_PASSWORD,
        role: 'Admin',
        phone: '+1 555 0101',
        gender: 'male',
    },
    {
        id: DEMO_USER_IDS.doctor,
        firstName: 'Anika',
        lastName: 'Rao',
        email: 'doctor@medsphere.local',
        username: 'doctor',
        password: DEMO_PASSWORD,
        role: 'Doctor',
        phone: '+91 80 5550 1002',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.cardiologist,
        firstName: 'Youssef',
        lastName: 'Benali',
        email: 'cardiology@medsphere.local',
        username: 'cardiologist',
        password: DEMO_PASSWORD,
        role: 'Doctor',
        phone: '+212 522 555 103',
        gender: 'male',
    },
    {
        id: DEMO_USER_IDS.pediatrician,
        firstName: 'Sofia',
        lastName: 'Kovalenko',
        email: 'pediatrics@medsphere.local',
        username: 'pediatrician',
        password: DEMO_PASSWORD,
        role: 'Doctor',
        phone: '+380 44 555 0104',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.nurse,
        firstName: 'Hana',
        lastName: 'Berisha',
        email: 'nurse@medsphere.local',
        username: 'nurse',
        password: DEMO_PASSWORD,
        role: 'Nurse',
        phone: '+383 44 100 005',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.emergencyNurse,
        firstName: 'Mei',
        lastName: 'Tanaka',
        email: 'nurse.emergency@medsphere.local',
        username: 'emergency-nurse',
        password: DEMO_PASSWORD,
        role: 'Nurse',
        phone: '+81 3 5550 0106',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.receptionist,
        firstName: 'Elena',
        lastName: 'Rossi',
        email: 'receptionist@medsphere.local',
        username: 'receptionist',
        password: DEMO_PASSWORD,
        role: 'Receptionist',
        phone: '+39 06 5550 0107',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.labTechnician,
        firstName: 'Kwame',
        lastName: 'Mensah',
        email: 'lab@medsphere.local',
        username: 'lab-tech',
        password: DEMO_PASSWORD,
        role: 'Lab Technician',
        phone: '+233 30 555 0108',
        gender: 'male',
    },
    {
        id: DEMO_USER_IDS.pharmacist,
        firstName: 'Leila',
        lastName: 'Haddad',
        email: 'pharmacy@medsphere.local',
        username: 'pharmacist',
        password: DEMO_PASSWORD,
        role: 'Pharmacist',
        phone: '+971 4 555 0109',
        gender: 'female',
    },
    {
        id: DEMO_USER_IDS.patient,
        firstName: 'Olivia',
        lastName: 'Brown',
        email: 'patient@medsphere.local',
        username: 'patient',
        password: DEMO_PASSWORD,
        role: 'Patient',
        phone: '+1 555 0105',
        dateOfBirth: new Date('1990-04-12T00:00:00.000Z'),
        gender: 'female',
        personalNumber: 'MSP-PAT-0005',
    },
    {
        id: DEMO_USER_IDS.patientSamir,
        firstName: 'Samir',
        lastName: 'Patel',
        email: 'samir.patel@medsphere.local',
        username: 'patient-samir',
        password: DEMO_PASSWORD,
        role: 'Patient',
        phone: '+44 20 5550 0110',
        dateOfBirth: new Date('1982-06-18T00:00:00.000Z'),
        gender: 'male',
        personalNumber: 'MSP-PAT-0110',
    },
    {
        id: DEMO_USER_IDS.patientLina,
        firstName: 'Lina',
        lastName: 'Hoxha',
        email: 'lina.hoxha@medsphere.local',
        username: 'patient-lina',
        password: DEMO_PASSWORD,
        role: 'Patient',
        phone: '+383 44 100 111',
        dateOfBirth: new Date('2016-03-07T00:00:00.000Z'),
        gender: 'female',
        personalNumber: 'MSP-PAT-0111',
    },
] as const;

const ROLE_NAMES = [
    'Super Admin',
    'Admin',
    'Doctor',
    'Nurse',
    'Receptionist',
    'Lab Technician',
    'Pharmacist',
    'Patient',
] as const;

const PERMISSIONS = [
    'users:read',
    'users:create',
    'users:update',
    'users:deactivate',
    'roles:manage',
    'permissions:manage',
    'departments:read',
    'departments:manage',
    'services:read',
    'services:manage',
    'staff-types:read',
    'staff-types:manage',
    'staff:read',
    'staff:manage',
    'patients:read',
    'patients:create',
    'patients:update',
    'patients:manage',
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:cancel',
    'medical_records:read',
    'medical_records:write',
    'prescriptions:read',
    'prescriptions:write',
    'lab_tests:read',
    'lab_tests:manage',
    'lab_orders:read',
    'lab_orders:create',
    'lab_orders:update',
    'lab_results:read',
    'lab_results:enter',
    'lab_results:review',
    'inventory:read',
    'inventory:manage',
    'pharmacy:read',
    'pharmacy:dispense',
    'billing:read',
    'billing:manage',
    'dashboard:read',
    'feedback:read',
    'feedback:manage',
    'contact:read',
    'contact:manage',
    'audit_logs:read',
    'reports:generate',
    'settings:read',
    'settings:manage',
    'cms:edit',
] as const;

type RoleName = (typeof ROLE_NAMES)[number];
type PermissionName = (typeof PERMISSIONS)[number];
type PermissionScope = 'own' | 'all';
type PermissionGrant = { permission: PermissionName; scope: PermissionScope };

function grants(permissions: readonly PermissionName[], scope: PermissionScope): PermissionGrant[] {
    return permissions.map((permission) => ({ permission, scope }));
}

const ALL_ACCESS = grants(PERMISSIONS, 'all');

const ROLE_PERMISSION_SCOPES: Record<RoleName, PermissionGrant[]> = {
    'Super Admin': ALL_ACCESS,
    Admin: ALL_ACCESS,
    Doctor: [
        ...grants(['users:read', 'users:update'], 'own'),
        ...grants([
            'departments:read',
            'services:read',
            'staff:read',
            'patients:read',
            'patients:manage',
            'appointments:read',
            'appointments:update',
            'medical_records:read',
            'medical_records:write',
            'prescriptions:read',
            'prescriptions:write',
            'lab_tests:read',
            'lab_orders:read',
            'lab_orders:create',
            'lab_results:read',
            'lab_results:review',
            'feedback:read',
        ], 'all'),
    ],
    Nurse: [
        ...grants(['users:read', 'users:update'], 'own'),
        ...grants([
            'departments:read',
            'services:read',
            'staff:read',
            'patients:read',
            'patients:manage',
            'appointments:read',
            'appointments:update',
            'medical_records:read',
            'prescriptions:read',
            'lab_orders:read',
            'lab_results:read',
        ], 'all'),
    ],
    Receptionist: [
        ...grants(['users:read', 'users:update'], 'own'),
        ...grants([
            'departments:read',
            'services:read',
            'staff:read',
            'patients:read',
            'patients:create',
            'patients:update',
            'patients:manage',
            'appointments:read',
            'appointments:create',
            'appointments:update',
            'appointments:cancel',
            'billing:read',
            'billing:manage',
            'dashboard:read',
        ], 'all'),
    ],
    'Lab Technician': [
        ...grants(['users:read', 'users:update'], 'own'),
        ...grants([
            'patients:read',
            'lab_tests:read',
            'lab_tests:manage',
            'lab_orders:read',
            'lab_orders:update',
            'lab_results:read',
            'lab_results:enter',
        ], 'all'),
    ],
    Pharmacist: [
        ...grants(['users:read', 'users:update'], 'own'),
        ...grants([
            'patients:read',
            'prescriptions:read',
            'inventory:read',
            'pharmacy:read',
            'pharmacy:dispense',
        ], 'all'),
    ],
    Patient: [
        ...grants(['users:read', 'users:update'], 'own'),
        ...grants([
            'patients:read',
            'patients:update',
            'patients:manage',
            'appointments:read',
            'appointments:create',
            'appointments:cancel',
            'medical_records:read',
            'prescriptions:read',
            'lab_orders:read',
            'lab_results:read',
            'billing:read',
            'feedback:read',
        ], 'own'),
    ],
};

function permissionCategory(permissionName: string) {
    return permissionName.split(':')[0] ?? 'access';
}

async function ensureRoles() {
    for (const roleName of ROLE_NAMES) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: {
                description: `${roleName} role`,
                isSystem: true,
            },
            create: {
                name: roleName,
                description: `${roleName} role`,
                isSystem: true,
            },
        });
    }
}

async function ensurePermissions() {
    for (const permissionName of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permissionName },
            update: {
                description: `${permissionName} permission`,
                category: permissionCategory(permissionName),
            },
            create: {
                name: permissionName,
                description: `${permissionName} permission`,
                category: permissionCategory(permissionName),
            },
        });
    }
}

async function ensureRolePermissions() {
    const roleMap = new Map((await prisma.role.findMany()).map((role) => [role.name, role]));
    const permissionMap = new Map((await prisma.permission.findMany()).map((permission) => [permission.name, permission]));

    for (const [roleName, roleGrants] of Object.entries(ROLE_PERMISSION_SCOPES)) {
        const role = roleMap.get(roleName);
        if (!role) {
            throw new Error(`Role ${roleName} not found after seeding roles`);
        }

        for (const grant of roleGrants) {
            const permission = permissionMap.get(grant.permission);
            if (!permission) {
                throw new Error(`Permission ${grant.permission} not found after seeding permissions`);
            }

            const existing = await prisma.rolePermission.findFirst({
                where: {
                    roleId: role.id,
                    permissionId: permission.id,
                    scope: grant.scope,
                },
            });

            if (!existing) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: permission.id,
                        scope: grant.scope,
                    },
                });
            }
        }
    }
}

async function ensureNoDifferentUserOwnsDemoId(userId: string, email: string) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });

    if (existing && existing.email !== email) {
        throw new Error(`Demo user id ${userId} is already used by ${existing.email}`);
    }
}

async function ensureDemoUser(demoUser: (typeof DEMO_USERS)[number]) {
    await ensureNoDifferentUserOwnsDemoId(demoUser.id, demoUser.email);

    const passwordHash = await bcrypt.hash(demoUser.password, 12);
    const now = new Date();

    const user = await prisma.user.upsert({
        where: { email: demoUser.email },
        update: {
            id: demoUser.id,
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
            username: demoUser.username,
            passwordHash,
            phone: 'phone' in demoUser ? demoUser.phone : undefined,
            dateOfBirth: 'dateOfBirth' in demoUser ? demoUser.dateOfBirth : undefined,
            gender: 'gender' in demoUser ? demoUser.gender : undefined,
            personalNumber: 'personalNumber' in demoUser ? demoUser.personalNumber : undefined,
            isActive: true,
            emailVerifiedAt: now,
        },
        create: {
            id: demoUser.id,
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
            email: demoUser.email,
            username: demoUser.username,
            passwordHash,
            phone: 'phone' in demoUser ? demoUser.phone : undefined,
            dateOfBirth: 'dateOfBirth' in demoUser ? demoUser.dateOfBirth : undefined,
            gender: 'gender' in demoUser ? demoUser.gender : undefined,
            personalNumber: 'personalNumber' in demoUser ? demoUser.personalNumber : undefined,
            isActive: true,
            emailVerifiedAt: now,
        },
    });

    const role = await prisma.role.findUnique({ where: { name: demoUser.role } });
    if (!role) {
        throw new Error(`${demoUser.role} role not found`);
    }

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: user.id,
                roleId: role.id,
            },
        },
        update: {},
        create: {
            userId: user.id,
            roleId: role.id,
        },
    });

    return user;
}

async function main() {
    await ensureRoles();
    await ensurePermissions();
    await ensureRolePermissions();

    const users = [];
    for (const demoUser of DEMO_USERS) {
        users.push(await ensureDemoUser(demoUser));
    }

    console.log('Auth seed complete.');
    for (const demoUser of DEMO_USERS) {
        const user = users.find((item) => item.email === demoUser.email);
        console.log(`${demoUser.role} email: ${demoUser.email}`);
        console.log(`${demoUser.role} username: ${demoUser.username}`);
        console.log(`${demoUser.role} user id: ${user?.id ?? demoUser.id}`);
        console.log(`${demoUser.role} password: ${demoUser.password}`);
    }
    console.log('Please change these passwords outside local/demo environments.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
