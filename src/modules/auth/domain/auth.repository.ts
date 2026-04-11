export interface CreateRefreshTokenData {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
    lastUsedAt?: Date;
}

export interface CreateOneTimeTokenData {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
}

export interface AuthUserView {
    id: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    roles: string[];
    permissions: string[];
}

export interface AuthRepository {
    getUserAuthByEmail(email: string): Promise<AuthUserView | null>;
    getUserAuthById(id: string): Promise<AuthUserView | null>;
    createRefreshToken(data: CreateRefreshTokenData): Promise<void>;
    findValidRefreshToken(tokenHash: string): Promise<any | null>;
    revokeRefreshToken(tokenHash: string): Promise<number>;
    revokeRefreshTokenById(id: string, userId: string): Promise<boolean>;
    revokeRefreshTokenByIdAnyUser(id: string): Promise<boolean>;
    revokeAllRefreshTokensByUser(userId: string): Promise<number>;
    touchRefreshToken(tokenHash: string): Promise<void>;
    listActiveSessions(userId: string): Promise<any[]>;
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
}
