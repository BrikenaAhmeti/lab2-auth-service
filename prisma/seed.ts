import bcrypt from 'bcrypt';
import { prisma } from '../src/infrastructure/db/prisma';

const DEFAULT_ADMIN = {
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@medsphere.local',
    password: 'Admin1234!Pass',
};

const DEFAULT_DOCTOR = {
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'doctor@medsphere.local',
    password: 'Doctor1234!Pass',
};

const ROLE_NAMES = ['Super Admin', 'Admin', 'Doctor', 'Nurse', 'Patient'] as const;

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
] as const;

const ROLE_PERMISSION_SCOPES: Record<
    (typeof ROLE_NAMES)[number],
    Array<{ permission: (typeof PERMISSIONS)[number]; scope: 'own' | 'all' }>
> = {
    'Super Admin': [
        { permission: 'users:read', scope: 'all' },
        { permission: 'users:create', scope: 'all' },
        { permission: 'users:update', scope: 'all' },
        { permission: 'users:deactivate', scope: 'all' },
        { permission: 'roles:manage', scope: 'all' },
        { permission: 'permissions:manage', scope: 'all' },
        { permission: 'departments:read', scope: 'all' },
        { permission: 'departments:manage', scope: 'all' },
        { permission: 'services:read', scope: 'all' },
        { permission: 'services:manage', scope: 'all' },
    ],
    Admin: [
        { permission: 'users:read', scope: 'all' },
        { permission: 'users:create', scope: 'all' },
        { permission: 'users:update', scope: 'all' },
        { permission: 'users:deactivate', scope: 'all' },
        { permission: 'roles:manage', scope: 'all' },
        { permission: 'permissions:manage', scope: 'all' },
        { permission: 'departments:read', scope: 'all' },
        { permission: 'departments:manage', scope: 'all' },
        { permission: 'services:read', scope: 'all' },
        { permission: 'services:manage', scope: 'all' },
    ],
    Doctor: [
        { permission: 'users:read', scope: 'own' },
        { permission: 'users:update', scope: 'own' },
    ],
    Nurse: [
        { permission: 'users:read', scope: 'own' },
        { permission: 'users:update', scope: 'own' },
    ],
    Patient: [
        { permission: 'users:read', scope: 'own' },
        { permission: 'users:update', scope: 'own' },
    ],
};

async function ensureRoles() {
    for (const roleName of ROLE_NAMES) {
        await prisma.role.upsert({
            where: { name: roleName },
            update: {},
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
            update: {},
            create: {
                name: permissionName,
                description: `${permissionName} permission`,
                category: 'access',
            },
        });
    }
}

async function ensureRolePermissions() {
    const roles = await prisma.role.findMany();
    const roleMap = new Map(roles.map((role) => [role.name, role]));

    for (const [roleName, grants] of Object.entries(ROLE_PERMISSION_SCOPES)) {
        const role = roleMap.get(roleName);
        if (!role) {
            throw new Error(`Role ${roleName} not found after seeding roles`);
        }

        for (const grant of grants) {
            const permission = await prisma.permission.findUnique({
                where: { name: grant.permission },
            });

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

async function ensureDefaultAdminUser() {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    const now = new Date();

    const user = await prisma.user.upsert({
        where: { email: DEFAULT_ADMIN.email },
        update: {
            firstName: DEFAULT_ADMIN.firstName,
            lastName: DEFAULT_ADMIN.lastName,
            passwordHash,
            isActive: true,
            emailVerifiedAt: now,
        },
        create: {
            firstName: DEFAULT_ADMIN.firstName,
            lastName: DEFAULT_ADMIN.lastName,
            email: DEFAULT_ADMIN.email,
            passwordHash,
            isActive: true,
            emailVerifiedAt: now,
        },
    });

    const superAdminRole = await prisma.role.findUnique({
        where: { name: 'Super Admin' },
    });

    if (!superAdminRole) {
        throw new Error('Super Admin role not found');
    }

    const existingUserRole = await prisma.userRole.findFirst({
        where: {
            userId: user.id,
            roleId: superAdminRole.id,
        },
    });

    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: superAdminRole.id,
            },
        });
    }

    return user;
}

async function ensureDefaultDoctorUser() {
    const passwordHash = await bcrypt.hash(DEFAULT_DOCTOR.password, 12);
    const now = new Date();

    const user = await prisma.user.upsert({
        where: { email: DEFAULT_DOCTOR.email },
        update: {
            firstName: DEFAULT_DOCTOR.firstName,
            lastName: DEFAULT_DOCTOR.lastName,
            passwordHash,
            isActive: true,
            emailVerifiedAt: now,
        },
        create: {
            firstName: DEFAULT_DOCTOR.firstName,
            lastName: DEFAULT_DOCTOR.lastName,
            email: DEFAULT_DOCTOR.email,
            passwordHash,
            isActive: true,
            emailVerifiedAt: now,
        },
    });

    const doctorRole = await prisma.role.findUnique({
        where: { name: 'Doctor' },
    });

    if (!doctorRole) {
        throw new Error('Doctor role not found');
    }

    const existingUserRole = await prisma.userRole.findFirst({
        where: {
            userId: user.id,
            roleId: doctorRole.id,
        },
    });

    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: doctorRole.id,
            },
        });
    }

    return user;
}

async function main() {
    await ensureRoles();
    await ensurePermissions();
    await ensureRolePermissions();
    const user = await ensureDefaultAdminUser();
    const doctor = await ensureDefaultDoctorUser();

    console.log('Seed complete.');
    console.log(`Admin email: ${user.email}`);
    console.log(`Admin password: ${DEFAULT_ADMIN.password}`);
    console.log(`Doctor email: ${doctor.email}`);
    console.log(`Doctor password: ${DEFAULT_DOCTOR.password}`);
    console.log('Please change this password after first login.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
