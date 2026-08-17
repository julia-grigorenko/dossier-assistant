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

export interface AnalysisCallbackStateRow {
    id: string;
    status: DossierStatus;
    processing_token: string | null;
}

export interface AnalysisCallbackState {
    id: string;
    status: DossierStatus;
    processingToken: string | null;
}

export interface SuccessfulAnalysisCallbackUpdate {
    request_type: RequestType;
    requested_amount: number | null;
    annual_revenue: number | null;
    company_age_years: number | null;
    urgency: Urgency | null;
    summary: string;
    confidence: number;
    missing_fields: string[];
    validation_warnings: string[];
    ai_raw_output: string;
    processing_error: null;
    processing_token: null;
    analysis_completed_at: string;
    status: "READY" | "NEEDS_REVIEW";
}

export interface MalformedAnalysisCallbackUpdate {
    request_type: null;
    requested_amount: null;
    annual_revenue: null;
    company_age_years: null;
    urgency: null;
    summary: null;
    confidence: null;
    missing_fields: string[];
    validation_warnings: string[];
    ai_raw_output: string;
    processing_error: null;
    processing_token: null;
    analysis_completed_at: string;
    status: "NEEDS_REVIEW";
}

export interface FailedAnalysisCallbackUpdate {
    status: "PROCESSING_FAILED";
    processing_error: string;
    ai_raw_output: string | null;
    processing_token: null;
    analysis_completed_at: string;
}