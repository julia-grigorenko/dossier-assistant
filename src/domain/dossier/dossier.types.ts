export const DOSSIER_STATUSES = [
    "PROCESSING",
    "READY",
    "NEEDS_REVIEW",
    "PROCESSING_FAILED",
    "APPROVED",
] as const;

export type DossierStatus = (typeof DOSSIER_STATUSES)[number];

export const REQUEST_TYPES = [
    "BUSINESS_FINANCING",
    "INSURANCE",
    "LEASING",
    "GENERAL",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;

export type Urgency = (typeof URGENCY_LEVELS)[number];

export interface CreateDossierInput {
    fullName: string;
    email: string;
    companyName: string;
    originalRequest: string;
}

export interface ExtractedAnalysis {
    requestType: RequestType;
    requestedAmount: number | null;
    annualRevenue: number | null;
    companyAgeYears: number | null;
    urgency: Urgency | null;
    summary: string;
    missingFields: string[];
    confidence: number;
}

export interface Dossier extends CreateDossierInput {
    id: string;
    status: DossierStatus;
    analysis: ExtractedAnalysis | null;
    validationWarnings: string[];
    processingError: string | null;
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
}

export interface AnalysisEvaluation {
    analysis: ExtractedAnalysis | null;
    status: Extract<DossierStatus, "READY" | "NEEDS_REVIEW">;
    warnings: string[];
}
export interface UpdateAnalysisInput {
    requestType: RequestType;
    requestedAmount: number | null;
    annualRevenue: number | null;
    companyAgeYears: number | null;
    urgency: Urgency | null;
    summary: string;
    missingFields: string[];
    confidence: number;
}

export type DossierNotFoundResult = {
    ok: false;
    error: "NOT_FOUND";
};

export type DossierValidationResult = {
    ok: false;
    error: "VALIDATION_ERROR";
    issues: string[];
};

export type DossierSuccessResult<T> = {
    ok: true;
    data: T;
};

export type DossierResult<T> =
    | DossierSuccessResult<T>
    | DossierNotFoundResult
    | DossierValidationResult;