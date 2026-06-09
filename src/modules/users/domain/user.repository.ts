export interface CreateUserData {
    firstName: string;
    lastName: string;
    email: string;
    username?: string | null;
    passwordHash: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: string;
    personalNumber?: string;
    avatarUrl?: string | null;
    isActive?: boolean;
    emailVerifiedAt?: Date | null;
    createdBy?: string;
    updatedBy?: string;
}

export interface UpdateMyProfileData {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    avatarFileId?: string | null;
    avatarUrl?: string | null;
    updatedBy?: string;
}

export interface UserRepository {
    create(data: CreateUserData): Promise<any>;
    deleteById(id: string): Promise<void>;
    findById(id: string): Promise<any | null>;
    findByIds(ids: string[]): Promise<any[]>;
    findByEmail(email: string): Promise<any | null>;
    findByUsername(username: string): Promise<any | null>;
    findByPersonalNumber(personalNumber: string): Promise<any | null>;
    findDoctors(): Promise<any[]>;
    updateMyProfile(userId: string, data: UpdateMyProfileData): Promise<any>;
}
