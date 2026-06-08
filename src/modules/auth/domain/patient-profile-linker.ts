export interface PatientProfileLinker {
    findByUserId(userId: string): Promise<{
        patientId: string | null;
        patientProfileId?: string | null;
        userId: string | null;
    }>;
    linkByPersonalNumber(input: {
        userId: string;
        personalNumber: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string | null;
        dateOfBirth?: Date | string | null;
        gender?: string | null;
    }): Promise<{
        linked: boolean;
        patientId: string | null;
        userId: string;
    }>;
}
