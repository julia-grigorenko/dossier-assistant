import { describe, expect, it } from "vitest";

import { persistableAnalysisSchema } from "./analysis.schema";
import { evaluateAnalysis } from "./evaluate-analysis";
import { buildMockAnalysis } from "./mock-analysis.samples";

describe("mock analysis samples", () => {
    it("produces READY for the complete sample", () => {
        const analysis = buildMockAnalysis("complete");
        const result = evaluateAnalysis(analysis);

        expect(result.status).toBe("READY");
        expect(result.warnings).toEqual([]);
        expect(result.analysis).toEqual(analysis);
    });

    it("produces NEEDS_REVIEW for the incomplete sample", () => {
        const analysis = buildMockAnalysis("incomplete");
        const result = evaluateAnalysis(analysis);

        expect(result.status).toBe("NEEDS_REVIEW");

        expect(result.warnings).toContain(
            "AI confidence is below 0.7.",
        );

        expect(result.warnings).toContain(
            "Missing or ambiguous fields: requestedAmount, annualRevenue, companyAgeYears, urgency.",
        );

        expect(result.analysis).toEqual(analysis);
    });

    it("produces the same complete sample every time", () => {
        const first = buildMockAnalysis("complete");
        const second = buildMockAnalysis("complete");

        expect(first).toEqual(second);
    });

    it("produces the same incomplete sample every time", () => {
        const first = buildMockAnalysis("incomplete");
        const second = buildMockAnalysis("incomplete");

        expect(first).toEqual(second);
    });

    it("creates separate sample objects", () => {
        const first = buildMockAnalysis("incomplete");
        const second = buildMockAnalysis("incomplete");

        expect(first).not.toBe(second);
        expect(first.missingFields).not.toBe(
            second.missingFields,
        );
    });

    it("produces samples that pass persistence validation", () => {
        const complete = persistableAnalysisSchema.safeParse(
            buildMockAnalysis("complete"),
        );

        const incomplete = persistableAnalysisSchema.safeParse(
            buildMockAnalysis("incomplete"),
        );

        expect(complete.success).toBe(true);
        expect(incomplete.success).toBe(true);
    });
});