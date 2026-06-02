export interface PatientProfileLinker {
    linkByPersonalNumber(input: {
        userId: string;
        personalNumber: string;
    }): Promise<{
        linked: boolean;
        patientId: string | null;
        userId: string;
    }>;
}
