import type { Dossier } from "@/domain/dossier/dossier.types";
import {
    apiError,
    issuesToFields,
    type ApiErrorBody,
} from "@/lib/api-response";
import {
    MOCK_ANALYSIS_SAMPLES,
} from "@/domain/dossier/mock-analysis.samples";
import {
    mockAnalysisService,
} from "@/services/mock-analysis.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const dossierIdSchema = z.string().uuid();

const mockRequestSchema = z
    .object({
        sample: z.enum(MOCK_ANALYSIS_SAMPLES),
    })
    .strict();

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

interface MockAnalysisResponse {
    data: Dossier;
    meta: {
        mock: true;
        sample: "complete" | "incomplete";
    };
}

export async function POST(
    request: NextRequest,
    context: RouteContext,
): Promise<
    NextResponse<MockAnalysisResponse | ApiErrorBody>
> {
    if (process.env.NODE_ENV !== "development") {
        return apiError(
            404,
            "NOT_FOUND",
            "The requested endpoint was not found.",
        );
    }

    const { id } = await context.params;
    const parsedId = dossierIdSchema.safeParse(id);

    if (!parsedId.success) {
        return apiError(
            400,
            "VALIDATION_ERROR",
            "The dossier ID is invalid.",
            {
                id: ["The dossier ID must be a valid UUID."],
            },
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return apiError(
            400,
            "INVALID_JSON",
            "The request body must contain valid JSON.",
        );
    }

    const parsedBody = mockRequestSchema.safeParse(body);

    if (!parsedBody.success) {
        return apiError(
            400,
            "VALIDATION_ERROR",
            "The mock-analysis request is invalid.",
            {
                sample: [
                    'Use either "complete" or "incomplete".',
                ],
            },
        );
    }

    try {
        const result = await mockAnalysisService.analyze(
            parsedId.data,
            parsedBody.data.sample,
        );

        if (!result.ok) {
            if (result.error === "NOT_FOUND") {
                return apiError(
                    404,
                    "NOT_FOUND",
                    "The requested dossier was not found.",
                );
            }

            return apiError(
                409,
                "INVALID_STATE",
                "Mock analysis cannot run for this dossier.",
                issuesToFields(result.issues),
            );
        }

        return NextResponse.json({
            data: result.data,
            meta: {
                mock: true,
                sample: parsedBody.data.sample,
            },
        });
    } catch (error) {
        console.error("Mock analysis failed", {
            code: "MOCK_ANALYSIS_FAILED",
            dossierId: parsedId.data,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The mock analysis could not be completed.",
        );
    }
}