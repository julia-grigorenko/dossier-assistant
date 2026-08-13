import { describe, expect, it } from "vitest";

import { evaluateAnalysis } from "./evaluate-analysis";
import type { ExtractedAnalysis } from "./dossier.types";

const validAnalysis: ExtractedAnalysis = {
    requestType: "BUSINESS_FINANCING",
    requestedAmount: 50_000,
    annualRevenue: 250_000,
    companyAgeYears: 4,
    urgency: "MEDIUM",
    summary: "Customer requests financing for business equipment.",
    missingFields: [],
    confidence: 0.9,
};

describe("evaluateAnalysis", () => {
    it("returns READY for valid, complete, confident analysis", () => {
        expect(evaluateAnalysis(validAnalysis)).toEqual({
            analysis: validAnalysis,
            status: "READY",
            warnings: [],
        });
    });

    it("returns NEEDS_REVIEW for low confidence", () => {
        const result = evaluateAnalysis({
            ...validAnalysis,
            confidence: 0.69,
        });

        expect(result.status).toBe("NEEDS_REVIEW");
        expect(result.warnings).toContain("AI confidence is below 0.7.");
    });

    it("returns NEEDS_REVIEW when fields are missing", () => {
        const result = evaluateAnalysis({
            ...validAnalysis,
            missingFields: ["requestedAmount", "annualRevenue"],
        });

        expect(result.status).toBe("NEEDS_REVIEW");
        expect(result.warnings[0]).toContain("requestedAmount");
        expect(result.warnings[0]).toContain("annualRevenue");
    });

    it("returns NEEDS_REVIEW for invalid numeric values", () => {
        const result = evaluateAnalysis({
            ...validAnalysis,
            requestedAmount: 0,
            annualRevenue: -1,
            companyAgeYears: -2,
        });

        expect(result.status).toBe("NEEDS_REVIEW");
        expect(result.warnings).toHaveLength(3);
    });

    it("does not trust malformed AI output", () => {
        const result = evaluateAnalysis({
            requestType: "UNSUPPORTED_TYPE",
            confidence: 5,
        });

        expect(result.status).toBe("NEEDS_REVIEW");
        expect(result.analysis).toBeNull();
        expect(result.warnings).toEqual([
            "AI output did not match the required analysis schema.",
        ]);
    });

    it("accepts confidence exactly at the threshold", () => {
        const result = evaluateAnalysis({
            ...validAnalysis,
            confidence: 0.7,
        });

        expect(result.status).toBe("READY");
    });
});