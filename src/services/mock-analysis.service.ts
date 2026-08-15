import "server-only";

import {
    buildMockAnalysis,
    type MockAnalysisSample,
} from "@/domain/dossier/mock-analysis.samples";
import type {
    Dossier,
    DossierResult,
} from "@/domain/dossier/dossier.types";

import { dossierService } from "./dossier.service";

export const mockAnalysisService = {
    async analyze(
        id: string,
        sample: MockAnalysisSample,
    ): Promise<DossierResult<Dossier>> {
        if (process.env.NODE_ENV !== "development") {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    "Mock analysis is available only in development.",
                ],
            };
        }

        const current = await dossierService.findById(id);

        if (!current.ok) {
            return current;
        }

        if (current.data.status !== "PROCESSING") {
            return {
                ok: false,
                error: "VALIDATION_ERROR",
                issues: [
                    `Mock analysis requires PROCESSING status; current status is ${current.data.status}.`,
                ],
            };
        }

        const analysis = buildMockAnalysis(sample);

        // Reuse the real validation, evaluation and persistence path.
        return dossierService.updateAnalysis(id, analysis);
    },
};