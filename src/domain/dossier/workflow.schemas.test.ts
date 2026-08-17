import { describe, expect, it } from "vitest";

import {
    extractedAnalysisSchema,
} from "./analysis.schema";

import {
    failureCallbackSchema,
    successCallbackSchema,
    workflowCallbackSchema,
    workflowContextResponseSchema,
    workflowTriggerSchema,
} from "./workflow.schemas";

const processingToken =
    "57cf75f5-1f96-4f25-b91d-183c529ec32d";

const dossierId =
    "a4142611-25c3-4ca5-aaf0-049b013a9336";

const validAnalysis = {
    requestType: "BUSINESS_FINANCING",
    requestedAmount: 50_000,
    annualRevenue: 250_000,
    companyAgeYears: 4,
    urgency: "MEDIUM",
    summary:
        "The company requests equipment financing.",
    missingFields: [],
    confidence: 0.91,
};

describe("n8n workflow contracts", () => {
    it("accepts a valid trigger body", () => {
        const result = workflowTriggerSchema.safeParse({
            dossierId,
            processingToken,
            contextUrl:
                `http://host.docker.internal:3000/api/internal/dossiers/${dossierId}/context`,
            callbackUrl:
                `http://host.docker.internal:3000/api/internal/dossiers/${dossierId}/analysis`,
        });

        expect(result.success).toBe(true);
    });

    it("accepts a context response without customer email", () => {
        const result =
            workflowContextResponseSchema.safeParse({
                data: {
                    id: dossierId,
                    fullName: "Alex Morgan",
                    companyName: "Northwind Studio",
                    originalRequest:
                        "We need €50,000 for business equipment.",
                    processingToken,
                },
            });

        expect(result.success).toBe(true);

        if (result.success) {
            expect(result.data.data).not.toHaveProperty(
                "email",
            );
        }
    });

    it("accepts a valid success callback", () => {
        const result = successCallbackSchema.safeParse({
            processingToken,
            outcome: "success",
            parsedOutput: validAnalysis,
            rawOutput:
                '{"requestType":"BUSINESS_FINANCING"}',
        });

        expect(result.success).toBe(true);
    });

    it("accepts a valid failure callback", () => {
        const result = failureCallbackSchema.safeParse({
            processingToken,
            outcome: "failure",
            errorCode: "LLM_TIMEOUT",
            errorMessage:
                "The model did not respond within the workflow timeout.",
            rawOutput: null,
        });

        expect(result.success).toBe(true);
    });

    it("rejects a callback without a processing token", () => {
        const result = workflowCallbackSchema.safeParse({
            outcome: "failure",
            errorCode: "LLM_TIMEOUT",
            errorMessage: "The model timed out.",
            rawOutput: null,
        });

        expect(result.success).toBe(false);
    });

    it("rejects an invalid outcome", () => {
        const result = workflowCallbackSchema.safeParse({
            processingToken,
            outcome: "complete",
            parsedOutput: validAnalysis,
            rawOutput: "{}",
        });

        expect(result.success).toBe(false);
    });

    it("allows the envelope but rejects extra analysis fields", () => {
        const envelope = workflowCallbackSchema.safeParse({
            processingToken,
            outcome: "success",
            parsedOutput: {
                ...validAnalysis,
                proposedApproval: true,
            },
            rawOutput: "{}",
        });

        // The callback envelope itself is valid.
        expect(envelope.success).toBe(true);

        if (
            envelope.success &&
            envelope.data.outcome === "success"
        ) {
            // The nested analysis remains untrusted until it is
            // separately validated by extractedAnalysisSchema.
            const analysis =
                extractedAnalysisSchema.safeParse(
                    envelope.data.parsedOutput,
                );

            expect(analysis.success).toBe(false);
        }
    });

    it("allows the envelope but rejects extra analysis fields", () => {
        const envelope = workflowCallbackSchema.safeParse({
            processingToken,
            outcome: "success",
            parsedOutput: {
                ...validAnalysis,
                proposedApproval: true,
            },
            rawOutput: "{}",
        });

        // The callback envelope itself is valid.
        expect(envelope.success).toBe(true);

        if (
            envelope.success &&
            envelope.data.outcome === "success"
        ) {
            // The nested analysis remains untrusted until it is
            // separately validated by extractedAnalysisSchema.
            const analysis =
                extractedAnalysisSchema.safeParse(
                    envelope.data.parsedOutput,
                );

            expect(analysis.success).toBe(false);
        }
    });

    it("allows the envelope but rejects confidence below zero", () => {
        const envelope = workflowCallbackSchema.safeParse({
            processingToken,
            outcome: "success",
            parsedOutput: {
                ...validAnalysis,
                confidence: -0.1,
            },
            rawOutput: "{}",
        });

        expect(envelope.success).toBe(true);

        if (
            envelope.success &&
            envelope.data.outcome === "success"
        ) {
            const analysis =
                extractedAnalysisSchema.safeParse(
                    envelope.data.parsedOutput,
                );

            expect(analysis.success).toBe(false);
        }
    });
})