export interface PatientProfileLinker {
    findByUserId(userId: string): Promise<{
        patientId: string | null;
        patientProfileId?: string | null;
        userId: string | null;
    }>;
    linkByPersonalNumber(input: {
        userId: string;
        personalNumber: string;
    }): Promise<{
        linked: boolean;
        patientId: string | null;
        userId: string;
    }>;
}
