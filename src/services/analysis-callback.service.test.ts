import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));

vi.mock(
    "@/repositories/dossier.repository",
    () => ({
        dossierRepository: {
            findAnalysisCallbackState: vi.fn(),
            completeAnalysisSuccess: vi.fn(),
            completeMalformedAnalysis: vi.fn(),
            completeAnalysisFailure: vi.fn(),
        },
    }),
);

import {
    dossierRepository,
} from "@/repositories/dossier.repository";
import {
    analysisCallbackService,
} from "./analysis-callback.service";

const dossierId =
    "a4142611-25c3-4ca5-aaf0-049b013a9336";

const processingToken =
    "57cf75f5-1f96-4f25-b91d-183c529ec32d";

const callbackState = {
    id: dossierId,
    status: "PROCESSING" as const,
    processingToken,
};

const findStateMock = vi.mocked(
    dossierRepository.findAnalysisCallbackState,
);

const successUpdateMock = vi.mocked(
    dossierRepository.completeAnalysisSuccess,
);

const malformedUpdateMock = vi.mocked(
    dossierRepository.completeMalformedAnalysis,
);

const failureUpdateMock = vi.mocked(
    dossierRepository.completeAnalysisFailure,
);

describe("analysisCallbackService", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        findStateMock.mockResolvedValue(callbackState);
    });

    it("persists valid analysis as READY", async () => {
        successUpdateMock.mockResolvedValue({
            id: dossierId,
            fullName: "Alex Morgan",
            email: "alex@example.com",
            companyName: "Northwind Studio",
            originalRequest: "We need financing.",
            status: "READY",
            analysis: {
                requestType: "BUSINESS_FINANCING",
                requestedAmount: 50_000,
                annualRevenue: 250_000,
                companyAgeYears: 4,
                urgency: "MEDIUM",
                summary:
                    "The company requests equipment financing.",
                missingFields: [],
                confidence: 0.91,
            },
            validationWarnings: [],
            processingError: null,
            createdAt: "2026-08-16T10:00:00.000Z",
            updatedAt: "2026-08-16T10:01:00.000Z",
            approvedAt: null,
        });

        const result =
            await analysisCallbackService.process(
                dossierId,
                {
                    processingToken,
                    outcome: "success",
                    parsedOutput: {
                        requestType: "BUSINESS_FINANCING",
                        requestedAmount: 50_000,
                        annualRevenue: 250_000,
                        companyAgeYears: 4,
                        urgency: "MEDIUM",
                        summary:
                            "The company requests equipment financing.",
                        missingFields: [],
                        confidence: 0.91,
                    },
                    rawOutput: "{}",
                },
            );

        expect(result.ok).toBe(true);

        expect(successUpdateMock).toHaveBeenCalledOnce();

        expect(
            malformedUpdateMock,
        ).not.toHaveBeenCalled();

        expect(
            failureUpdateMock,
        ).not.toHaveBeenCalled();
    });

    it("stores malformed output as NEEDS_REVIEW without trusted analysis fields", async () => {
        malformedUpdateMock.mockResolvedValue({
            id: dossierId,
            fullName: "Alex Morgan",
            email: "alex@example.com",
            companyName: "Northwind Studio",
            originalRequest: "We need financing.",
            status: "NEEDS_REVIEW",
            analysis: null,
            validationWarnings: [
                "AI output did not match the required analysis schema.",
            ],
            processingError: null,
            createdAt: "2026-08-16T10:00:00.000Z",
            updatedAt: "2026-08-16T10:01:00.000Z",
            approvedAt: null,
        });

        const result =
            await analysisCallbackService.process(
                dossierId,
                {
                    processingToken,
                    outcome: "success",
                    parsedOutput: {
                        requestType: "NOT_SUPPORTED",
                        confidence: 4,
                    },
                    rawOutput:
                        '{"requestType":"NOT_SUPPORTED"}',
                },
            );

        expect(result.ok).toBe(true);

        expect(
            malformedUpdateMock,
        ).toHaveBeenCalledWith(
            dossierId,
            processingToken,
            expect.objectContaining({
                request_type: null,
                requested_amount: null,
                status: "NEEDS_REVIEW",
                processing_token: null,
            }),
        );

        expect(
            successUpdateMock,
        ).not.toHaveBeenCalled();
    });

    it("rejects a wrong processing token without updating", async () => {
        const result =
            await analysisCallbackService.process(
                dossierId,
                {
                    processingToken:
                        "ef31d6a6-d509-4cca-9150-c499d46a3be1",
                    outcome: "failure",
                    errorCode: "LLM_TIMEOUT",
                    errorMessage: "The model timed out.",
                    rawOutput: null,
                },
            );

        expect(result).toEqual({
            ok: false,
            error: "TOKEN_MISMATCH",
            message:
                "The supplied processing token is invalid.",
        });

        expect(
            successUpdateMock,
        ).not.toHaveBeenCalled();

        expect(
            malformedUpdateMock,
        ).not.toHaveBeenCalled();

        expect(
            failureUpdateMock,
        ).not.toHaveBeenCalled();
    });
});