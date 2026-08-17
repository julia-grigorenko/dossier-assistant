import "server-only";

import {
    extractedAnalysisSchema,
    persistableAnalysisSchema,
} from "@/domain/dossier/analysis.schema";
import type {
    Dossier,
} from "@/domain/dossier/dossier.types";
import {
    evaluateAnalysis,
} from "@/domain/dossier/evaluate-analysis";
import type {
    WorkflowCallback,
} from "@/domain/dossier/workflow.types";
import {
    dossierRepository,
} from "@/repositories/dossier.repository";
import type {
    FailedAnalysisCallbackUpdate,
    MalformedAnalysisCallbackUpdate,
    SuccessfulAnalysisCallbackUpdate,
} from "@/repositories/dossier-row";

export type AnalysisCallbackErrorCode =
    | "NOT_FOUND"
    | "INVALID_STATE"
    | "TOKEN_MISMATCH"
    | "UPDATE_CONFLICT";

export type AnalysisCallbackResult =
    | {
    ok: true;
    data: Dossier;
    meta: {
        alreadyProcessed: false;
    };
}
    | {
    ok: false;
    error: AnalysisCallbackErrorCode;
    message: string;
};

function validateCallbackState(
    state: {
        status: string;
        processingToken: string | null;
    },
    suppliedToken: string,
): AnalysisCallbackResult | null {
    if (state.status !== "PROCESSING") {
        return {
            ok: false,
            error: "INVALID_STATE",
            message:
                `Dossier cannot accept a callback while status is ${state.status}.`,
        };
    }

    if (!state.processingToken) {
        return {
            ok: false,
            error: "INVALID_STATE",
            message:
                "The dossier does not have an active processing token.",
        };
    }

    if (state.processingToken !== suppliedToken) {
        return {
            ok: false,
            error: "TOKEN_MISMATCH",
            message:
                "The supplied processing token is invalid.",
        };
    }

    return null;
}

function formatAnalysisIssues(
    issues: Array<{
        path: PropertyKey[];
        message: string;
    }>,
): string[] {
    return [
        "AI output did not match the required analysis schema.",
        ...issues.slice(0, 10).map((issue) => {
            const path = issue.path.join(".");

            return path
                ? `${path}: ${issue.message}`
                : issue.message;
        }),
    ];
}

function sanitizeProcessingError(
    errorCode: string,
    errorMessage: string,
): string {
    const normalizedMessage = errorMessage
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

    return `${errorCode}: ${normalizedMessage}`;
}

async function processSuccess(
    dossierId: string,
    callback: Extract<
        WorkflowCallback,
        { outcome: "success" }
    >,
): Promise<AnalysisCallbackResult> {
    const state =
        await dossierRepository.findAnalysisCallbackState(
            dossierId,
        );

    if (!state) {
        return {
            ok: false,
            error: "NOT_FOUND",
            message: "The dossier was not found.",
        };
    }

    const stateError = validateCallbackState(
        state,
        callback.processingToken,
    );

    if (stateError) {
        return stateError;
    }

    const structurallyValid =
        extractedAnalysisSchema.safeParse(
            callback.parsedOutput,
        );

    if (!structurallyValid.success) {
        const update: MalformedAnalysisCallbackUpdate = {
            request_type: null,
            requested_amount: null,
            annual_revenue: null,
            company_age_years: null,
            urgency: null,
            summary: null,
            confidence: null,
            missing_fields: [],
            validation_warnings: formatAnalysisIssues(
                structurallyValid.error.issues,
            ),
            ai_raw_output: callback.rawOutput,
            processing_error: null,
            processing_token: null,
            analysis_completed_at:
                new Date().toISOString(),
            status: "NEEDS_REVIEW",
        };

        const updated =
            await dossierRepository.completeMalformedAnalysis(
                dossierId,
                callback.processingToken,
                update,
            );

        return updated
            ? {
                ok: true,
                data: updated,
                meta: {
                    alreadyProcessed: false,
                },
            }
            : {
                ok: false,
                error: "UPDATE_CONFLICT",
                message:
                    "The dossier changed before the callback was applied.",
            };
    }

    const evaluation = evaluateAnalysis(
        structurallyValid.data,
    );

    if (!evaluation.analysis) {
        return {
            ok: false,
            error: "UPDATE_CONFLICT",
            message:
                "Analysis unexpectedly failed after schema validation.",
        };
    }

    // Enforce database-compatible numeric constraints.
    const persistable = persistableAnalysisSchema.safeParse(
        evaluation.analysis,
    );

    if (!persistable.success) {
        const warnings = [
            ...evaluation.warnings,
            ...formatAnalysisIssues(
                persistable.error.issues,
            ),
        ];

        const update: MalformedAnalysisCallbackUpdate = {
            request_type: null,
            requested_amount: null,
            annual_revenue: null,
            company_age_years: null,
            urgency: null,
            summary: null,
            confidence: null,
            missing_fields:
            evaluation.analysis.missingFields,
            validation_warnings: warnings,
            ai_raw_output: callback.rawOutput,
            processing_error: null,
            processing_token: null,
            analysis_completed_at:
                new Date().toISOString(),
            status: "NEEDS_REVIEW",
        };

        const updated =
            await dossierRepository.completeMalformedAnalysis(
                dossierId,
                callback.processingToken,
                update,
            );

        return updated
            ? {
                ok: true,
                data: updated,
                meta: {
                    alreadyProcessed: false,
                },
            }
            : {
                ok: false,
                error: "UPDATE_CONFLICT",
                message:
                    "The dossier changed before the callback was applied.",
            };
    }

    const analysis = persistable.data;

    const update: SuccessfulAnalysisCallbackUpdate = {
        request_type: analysis.requestType,
        requested_amount: analysis.requestedAmount,
        annual_revenue: analysis.annualRevenue,
        company_age_years: analysis.companyAgeYears,
        urgency: analysis.urgency,
        summary: analysis.summary,
        confidence: analysis.confidence,
        missing_fields: analysis.missingFields,
        validation_warnings: evaluation.warnings,
        ai_raw_output: callback.rawOutput,
        processing_error: null,
        processing_token: null,
        analysis_completed_at:
            new Date().toISOString(),
        status: evaluation.status,
    };

    const updated =
        await dossierRepository.completeAnalysisSuccess(
            dossierId,
            callback.processingToken,
            update,
        );

    return updated
        ? {
            ok: true,
            data: updated,
            meta: {
                alreadyProcessed: false,
            },
        }
        : {
            ok: false,
            error: "UPDATE_CONFLICT",
            message:
                "The dossier changed before the callback was applied.",
        };
}

async function processFailure(
    dossierId: string,
    callback: Extract<
        WorkflowCallback,
        { outcome: "failure" }
    >,
): Promise<AnalysisCallbackResult> {
    const state =
        await dossierRepository.findAnalysisCallbackState(
            dossierId,
        );

    if (!state) {
        return {
            ok: false,
            error: "NOT_FOUND",
            message: "The dossier was not found.",
        };
    }

    const stateError = validateCallbackState(
        state,
        callback.processingToken,
    );

    if (stateError) {
        return stateError;
    }

    const update: FailedAnalysisCallbackUpdate = {
        status: "PROCESSING_FAILED",
        processing_error: sanitizeProcessingError(
            callback.errorCode,
            callback.errorMessage,
        ),
        ai_raw_output: callback.rawOutput,
        processing_token: null,
        analysis_completed_at:
            new Date().toISOString(),
    };

    const updated =
        await dossierRepository.completeAnalysisFailure(
            dossierId,
            callback.processingToken,
            update,
        );

    return updated
        ? {
            ok: true,
            data: updated,
            meta: {
                alreadyProcessed: false,
            },
        }
        : {
            ok: false,
            error: "UPDATE_CONFLICT",
            message:
                "The dossier changed before the callback was applied.",
        };
}

export const analysisCallbackService = {
    async process(
        dossierId: string,
        callback: WorkflowCallback,
    ): Promise<AnalysisCallbackResult> {
        if (callback.outcome === "success") {
            return processSuccess(dossierId, callback);
        }

        return processFailure(dossierId, callback);
    },
};