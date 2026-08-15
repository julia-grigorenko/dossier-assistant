import type { ExtractedAnalysis } from "./dossier.types";

export const MOCK_ANALYSIS_SAMPLES = [
    "complete",
    "incomplete",
] as const;

export type MockAnalysisSample =
    (typeof MOCK_ANALYSIS_SAMPLES)[number];

export function buildMockAnalysis(
    sample: MockAnalysisSample,
): ExtractedAnalysis {
    if (sample === "complete") {
        return {
            requestType: "BUSINESS_FINANCING",
            requestedAmount: 75_000,
            annualRevenue: 450_000,
            companyAgeYears: 6,
            urgency: "MEDIUM",
            summary:
                "The company requests financing for business equipment and supplied the principal financial details.",
            missingFields: [],
            confidence: 0.92,
        };
    }

    return {
        requestType: "GENERAL",
        requestedAmount: null,
        annualRevenue: null,
        companyAgeYears: null,
        urgency: null,
        summary:
            "The customer described a general business need, but important financial and timing details are missing.",
        missingFields: [
            "requestedAmount",
            "annualRevenue",
            "companyAgeYears",
            "urgency",
        ],
        confidence: 0.55,
    };
}