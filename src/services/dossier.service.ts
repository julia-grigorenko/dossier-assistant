import "server-only";

import { persistableAnalysisSchema } from "@/domain/dossier/analysis.schema";
import { createDossierSchema } from "@/domain/dossier/dossier.schemas";
import type {
    Dossier,
    DossierResult,
    DossierStatus,
} from "@/domain/dossier/dossier.types";
import { evaluateAnalysis } from "@/domain/dossier/evaluate-analysis";
import { canTransitionStatus } from "@/domain/dossier/status-transitions";
import { dossierRepository } from "@/repositories/dossier.repository";
import type {
    WorkflowContextData,
} from "@/domain/dossier/workflow.types";

function validationIssues(error: {
    issues: Array<{ path: PropertyKey[]; message: string }>;
}): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.join(".");

        return path ? `${path}: ${issue.message}` : issue.message;
    });
}

export const dossierService = {
    async create(input: unknown): Promise<DossierResult<Dossier>> {
        const parsed = createDossierSchema.safeParse(input);

        if (!parsed.success) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: validationIssues(parsed.error),
            };
        }

        const dossier = await dossierRepository.create(parsed.data);

        return { ok: true, data: dossier };
    },

    async findById(id: string): Promise<DossierResult<Dossier>> {
        const dossier = await dossierRepository.findById(id);

        return dossier
            ? { ok: true, data: dossier }
            : { ok: false, error: "NOT_FOUND" };
    },

    async findAll(status?: DossierStatus): Promise<Dossier[]> {
        return dossierRepository.findAll(status);
    },

    async getProcessingContext(
        id: string,
    ): Promise<DossierResult<WorkflowContextData>> {
        const context =
            await dossierRepository.findProcessingContext(id);

        if (!context) {
            return {
                ok: false,
                error: "NOT_FOUND",
            };
        }

        if (context.status !== "PROCESSING") {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    `Dossier context is unavailable while status is ${context.status}.`,
                ],
            };
        }

        if (!context.processingToken) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    "The processing dossier does not have a processing token.",
                ],
            };
        }

        return {
            ok: true,
            data: {
                id: context.id,
                fullName: context.fullName,
                companyName: context.companyName,
                originalRequest: context.originalRequest,
                processingToken: context.processingToken,
            },
        };
    },

    async updateAnalysis(
        id: string,
        input: unknown,
    ): Promise<DossierResult<Dossier>> {
        // 1. Retrieve the current dossier.
        const dossier = await dossierRepository.findById(id);

        if (!dossier) {
            return {
                ok: false,
                error: "NOT_FOUND",
            };
        }

        // 2. Approved dossiers are immutable.
        if (dossier.status === "APPROVED") {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    "An approved dossier cannot be modified.",
                ],
            };
        }

        // 3. Validate the corrected analysis.
        // Because the schema is strict, customer fields such as
        // fullName and email are rejected.
        const parsed =
            persistableAnalysisSchema.safeParse(input);

        if (!parsed.success) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: validationIssues(parsed.error),
            };
        }

        // 4. Recalculate warnings and READY/NEEDS_REVIEW.
        const evaluation = evaluateAnalysis(parsed.data);

        if (!evaluation.analysis) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: evaluation.warnings,
            };
        }

        // 5. Ensure the calculated status transition is allowed.
        if (
            !canTransitionStatus(
                dossier.status,
                evaluation.status,
            )
        ) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    `Cannot update analysis while status is ${dossier.status}.`,
                ],
            };
        }

        // 6. Persist the validated analysis, calculated status,
        // and calculated warnings.
        const updated =
            await dossierRepository.updateAnalysis(
                id,
                evaluation.analysis,
                evaluation.status,
                evaluation.warnings,
            );

        return updated
            ? {
                ok: true,
                data: updated,
            }
            : {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    "The dossier changed before the corrections were saved. Refresh and try again.",
                ],
            };
    },

    async updateStatus(
        id: string,
        nextStatus: Exclude<DossierStatus, "APPROVED">,
    ): Promise<DossierResult<Dossier>> {
        const dossier = await dossierRepository.findById(id);

        if (!dossier) {
            return { ok: false, error: "NOT_FOUND" };
        }

        // Automated/general status changes cannot approve dossiers.
        if (!canTransitionStatus(dossier.status, nextStatus)) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    `Invalid status transition: ${dossier.status} -> ${nextStatus}`,
                ],
            };
        }

        const updated = await dossierRepository.updateStatus(
            id,
            dossier.status,
            nextStatus,
        );

        return updated
            ? { ok: true, data: updated }
            : { ok: false, error: "NOT_FOUND" };
    },

    async approve(
        id: string,
    ): Promise<DossierResult<Dossier>> {
        // 1. Retrieve the dossier.
        const dossier = await dossierRepository.findById(id);

        if (!dossier) {
            return {
                ok: false,
                error: "NOT_FOUND",
            };
        }

        // 2. Approval is allowed only after analysis.
        if (
            dossier.status !== "READY" &&
            dossier.status !== "NEEDS_REVIEW"
        ) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    `A dossier with status ${dossier.status} cannot be approved.`,
                ],
            };
        }

        // 3. A dossier cannot be approved without analysis.
        if (!dossier.analysis) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    "A dossier must contain validated analysis before approval.",
                ],
            };
        }

        // 4. Stored analysis must pass hard validation.
        const parsed =
            persistableAnalysisSchema.safeParse(dossier.analysis);

        if (!parsed.success) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: validationIssues(parsed.error),
            };
        }

        // 5. Persist APPROVED and approved_at together.
        const approved = await dossierRepository.approve(
            id,
            dossier.status,
        );

        // A null result here normally means another request changed
        // the dossier after it was retrieved.
        return approved
            ? {
                ok: true,
                data: approved,
            }
            : {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    "The dossier changed before approval. Refresh and try again.",
                ],
            };
    },
};