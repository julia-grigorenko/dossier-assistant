import { extractedAnalysisSchema } from "./analysis.schema";
import type { AnalysisEvaluation } from "./dossier.types";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

export function evaluateAnalysis(input: unknown): AnalysisEvaluation {
    const parsed = extractedAnalysisSchema.safeParse(input);

    if (!parsed.success) {
        return {
            analysis: null,
            status: "NEEDS_REVIEW",
            warnings: [
                "AI output did not match the required analysis schema.",
            ],
        };
    }

    const analysis = parsed.data;
    const warnings: string[] = [];

    if (analysis.confidence < LOW_CONFIDENCE_THRESHOLD) {
        warnings.push("AI confidence is below 0.7.");
    }

    if (analysis.missingFields.length > 0) {
        warnings.push(
            `Missing or ambiguous fields: ${analysis.missingFields.join(", ")}.`,
        );
    }

    if (
        analysis.requestedAmount !== null &&
        analysis.requestedAmount <= 0
    ) {
        warnings.push("Requested amount must be greater than zero.");
    }

    if (
        analysis.annualRevenue !== null &&
        analysis.annualRevenue < 0
    ) {
        warnings.push("Annual revenue cannot be negative.");
    }

    if (
        analysis.companyAgeYears !== null &&
        analysis.companyAgeYears < 0
    ) {
        warnings.push("Company age cannot be negative.");
    }

    return {
        analysis,
        status: warnings.length === 0 ? "READY" : "NEEDS_REVIEW",
        warnings,
    };
}