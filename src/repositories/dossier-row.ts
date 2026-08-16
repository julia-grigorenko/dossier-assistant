import type {
    DossierStatus,
    RequestType,
    Urgency,
} from "@/domain/dossier/dossier.types";

export interface DossierRow {
    id: string;

    full_name: string;
    email: string;
    company_name: string;
    original_request: string;

    status: DossierStatus;

    request_type: RequestType | null;
    requested_amount: number | null;
    annual_revenue: number | null;
    company_age_years: number | null;
    urgency: Urgency | null;
    summary: string | null;
    confidence: number | null;

    missing_fields: string[];
    validation_warnings: string[];

    ai_raw_output: string | null;
    processing_error: string | null;
    processing_token: string | null;
    analysis_completed_at: string | null;

    created_at: string;
    updated_at: string;
    approved_at: string | null;
}

export interface DossierInsert {
    full_name: string;
    email: string;
    company_name: string;
    original_request: string;
    status: "PROCESSING";
    processing_token: string;
}

export interface AnalysisUpdate {
    request_type: RequestType;
    requested_amount: number | null;
    annual_revenue: number | null;
    company_age_years: number | null;
    urgency: Urgency | null;
    summary: string;
    confidence: number;
    missing_fields: string[];
    validation_warnings: string[];
    status: Extract<DossierStatus, "READY" | "NEEDS_REVIEW">;
    analysis_completed_at: string;
    processing_error: null;
}

export interface ProcessingContextRow {
    id: string;
    full_name: string;
    company_name: string;
    original_request: string;
    status: DossierStatus;
    processing_token: string | null;
}

export interface ProcessingContextRecord {
    id: string;
    fullName: string;
    companyName: string;
    originalRequest: string;
    status: DossierStatus;
    processingToken: string | null;
}