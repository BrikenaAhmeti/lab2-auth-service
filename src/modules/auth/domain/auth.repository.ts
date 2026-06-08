export interface CreateRefreshTokenData {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
    lastUsedAt?: Date;
}

export interface CreateAdminUserData {
    firstName: string;
    lastName: string;
    email: string;
    username?: string | null;
    passwordHash: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: string;
    personalNumber?: string;
    isActive?: boolean;
    emailVerifiedAt?: Date | null;
    createdBy?: string;
}

export interface CreateOneTimeTokenData {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
}

export interface AuthUserView {
    id: string;
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    personalNumber?: string | null;
    passwordHash: string;
    isActive: boolean;
    roles: string[];
    permissions: string[];
}

export interface SessionUserView {
    id: string;
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
}

export interface ActiveSessionView {
    id: string;
    userId: string;
    deviceInfo?: string | null;
    ipAddress?: string | null;
    expiresAt: Date;
    lastUsedAt: Date;
    createdAt: Date;
    user: SessionUserView;
}

export interface AuthRepository {
    getUserAuthByIdentifier(identifier: string): Promise<AuthUserView | null>;
    getUserAuthById(id: string): Promise<AuthUserView | null>;
    createRefreshToken(data: CreateRefreshTokenData): Promise<void>;
    findValidRefreshToken(tokenHash: string): Promise<any | null>;
    revokeRefreshToken(tokenHash: string): Promise<number>;
    revokeRefreshTokenById(id: string, userId: string): Promise<boolean>;
    revokeRefreshTokenByIdAnyUser(id: string): Promise<boolean>;
    revokeAllRefreshTokensByUser(userId: string): Promise<number>;
    touchRefreshToken(tokenHash: string): Promise<void>;
    listActiveSessions(userId: string): Promise<ActiveSessionView[]>;
    listAllActiveSessions(): Promise<ActiveSessionView[]>;
    findActiveSessionById(id: string, userId?: string): Promise<ActiveSessionView | null>;
    createEmailVerificationToken(data: CreateOneTimeTokenData): Promise<void>;
    invalidateEmailVerificationTokens(userId: string): Promise<void>;
    findValidEmailVerificationToken(tokenHash: string): Promise<any | null>;
    markEmailVerificationTokenUsed(id: string): Promise<void>;
    markUserEmailVerified(userId: string): Promise<void>;
    createPasswordResetToken(data: CreateOneTimeTokenData): Promise<void>;
    invalidatePasswordResetTokens(userId: string): Promise<void>;
    findValidPasswordResetToken(tokenHash: string): Promise<any | null>;
    markPasswordResetTokenUsed(id: string): Promise<void>;
    updateUserPasswordHash(userId: string, passwordHash: string): Promise<void>;
    findRolesByNames(names: string[]): Promise<Array<{ id: string; name: string }>>;
    createUserWithRoles(
        data: CreateAdminUserData,
        roleIds: string[],
    ): Promise<{
        id: string;
        email: string;
        username?: string | null;
        firstName: string;
        lastName: string;
        isActive: boolean;
        roles: string[];
    }>;
    assignRolesToUser(userId: string, roleIds: string[], actorUserId?: string): Promise<void>;
}
