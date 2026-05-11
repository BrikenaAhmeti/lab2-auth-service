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
    { name: 'users:read', scope: 'all' },
    { name: 'users:create', scope: 'all' },
    { name: 'users:update', scope: 'all' },
    { name: 'users:deactivate', scope: 'all' },
    { name: 'roles:manage', scope: 'all' },
    { name: 'permissions:manage', scope: 'all' },
    { name: 'departments:read', scope: 'all' },
    { name: 'departments:manage', scope: 'all' },
    { name: 'services:read', scope: 'all' },
    { name: 'services:manage', scope: 'all' },
] as const;

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
    for (const item of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: item.name },
            update: {},
            create: {
                name: item.name,
                description: `${item.name} permission`,
                category: 'access',
            },
        });
    }
}

async function ensureAdminRolePermissions() {
    const roles = await prisma.role.findMany({
        where: {
            name: {
                in: ['Admin', 'Super Admin'],
            },
        },
    });

    if (roles.length !== 2) {
        throw new Error('Admin roles not found after seeding roles');
    }

    for (const role of roles) {
        for (const item of PERMISSIONS) {
            const permission = await prisma.permission.findUnique({
                where: { name: item.name },
            });

            if (!permission) {
                throw new Error(`Permission ${item.name} not found after seeding permissions`);
            }

            const existing = await prisma.rolePermission.findFirst({
                where: {
                    roleId: role.id,
                    permissionId: permission.id,
                    scope: item.scope,
                },
            });

            if (!existing) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: permission.id,
                        scope: item.scope,
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
    await ensureAdminRolePermissions();
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
