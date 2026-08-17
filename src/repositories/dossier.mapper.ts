import type {
    CreateDossierInput,
    Dossier,
    ExtractedAnalysis,
} from "@/domain/dossier/dossier.types";

import type {
    AnalysisCallbackState,
    AnalysisCallbackStateRow,
    AnalysisUpdate,
    DossierInsert,
    DossierRow,
    ProcessingContextRecord,
    ProcessingContextRow,
} from "./dossier-row";

export function mapDossierRow(row: DossierRow): Dossier {
    const hasAnalysis =
        row.request_type !== null &&
        row.summary !== null &&
        row.confidence !== null;

    const analysis: ExtractedAnalysis | null = hasAnalysis
        ? {
            requestType: row.request_type!,
            requestedAmount: row.requested_amount,
            annualRevenue: row.annual_revenue,
            companyAgeYears: row.company_age_years,
            urgency: row.urgency,
            summary: row.summary!,
            missingFields: row.missing_fields,
            confidence: row.confidence!,
        }
        : null;

    return {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        companyName: row.company_name,
        originalRequest: row.original_request,
        status: row.status,
        analysis,
        validationWarnings: row.validation_warnings,
        processingError: row.processing_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        approvedAt: row.approved_at,
    };
}

export function mapCreateInput(
    input: CreateDossierInput,
    processingToken: string,
): DossierInsert {
    return {
        full_name: input.fullName,
        email: input.email,
        company_name: input.companyName,
        original_request: input.originalRequest,
        status: "PROCESSING",
        processing_token: processingToken,
    };
}

export function mapAnalysisUpdate(
    analysis: ExtractedAnalysis,
    status: "READY" | "NEEDS_REVIEW",
    warnings: string[],
): AnalysisUpdate {
    return {
        request_type: analysis.requestType,
        requested_amount: analysis.requestedAmount,
        annual_revenue: analysis.annualRevenue,
        company_age_years: analysis.companyAgeYears,
        urgency: analysis.urgency,
        summary: analysis.summary,
        confidence: analysis.confidence,
        missing_fields: analysis.missingFields,
        validation_warnings: warnings,
        status,
        analysis_completed_at: new Date().toISOString(),
        processing_error: null,
    };
}

export function mapProcessingContextRow(
    row: ProcessingContextRow,
): ProcessingContextRecord {
    return {
        id: row.id,
        fullName: row.full_name,
        companyName: row.company_name,
        originalRequest: row.original_request,
        status: row.status,
        processingToken: row.processing_token,
    };
}

export function mapAnalysisCallbackStateRow(
    row: AnalysisCallbackStateRow,
): AnalysisCallbackState {
    return {
        id: row.id,
        status: row.status,
        processingToken: row.processing_token,
    };
}