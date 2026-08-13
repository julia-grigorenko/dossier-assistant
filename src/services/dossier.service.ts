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

    async updateAnalysis(
        id: string,
        input: unknown,
    ): Promise<DossierResult<Dossier>> {
        const dossier = await dossierRepository.findById(id);

        if (!dossier) {
            return { ok: false, error: "NOT_FOUND" };
        }

        if (dossier.status === "APPROVED") {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: ["An approved dossier cannot be modified."],
            };
        }

        const parsed = persistableAnalysisSchema.safeParse(input);

        if (!parsed.success) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: validationIssues(parsed.error),
            };
        }

        const evaluation = evaluateAnalysis(parsed.data);

        if (!evaluation.analysis) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: evaluation.warnings,
            };
        }

        if (
            !canTransitionStatus(dossier.status, evaluation.status)
        ) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    `Cannot update analysis while status is ${dossier.status}.`,
                ],
            };
        }

        const updated = await dossierRepository.updateAnalysis(
            id,
            evaluation.analysis,
            evaluation.status,
            evaluation.warnings,
        );

        return updated
            ? { ok: true, data: updated }
            : { ok: false, error: "NOT_FOUND" };
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

    async approve(id: string): Promise<DossierResult<Dossier>> {
        const dossier = await dossierRepository.findById(id);

        if (!dossier) {
            return { ok: false, error: "NOT_FOUND" };
        }

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

        if (!dossier.analysis) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: ["A dossier must contain validated analysis."],
            };
        }

        const parsedAnalysis =
            persistableAnalysisSchema.safeParse(dossier.analysis);

        if (!parsedAnalysis.success) {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: validationIssues(parsedAnalysis.error),
            };
        }

        const approved = await dossierRepository.approve(
            id,
            dossier.status,
        );

        return approved
            ? { ok: true, data: approved }
            : { ok: false, error: "NOT_FOUND" };
    },
};