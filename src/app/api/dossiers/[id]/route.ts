import type { Dossier } from "@/domain/dossier/dossier.types";
import {
    apiError,
    type ApiErrorBody,
} from "@/lib/api-response";
import { dossierService } from "@/services/dossier.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const dossierIdSchema = z.string().uuid();

interface DossierResponse {
    data: Dossier;
}

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export async function GET(
    _request: NextRequest,
    context: RouteContext,
): Promise<NextResponse<DossierResponse | ApiErrorBody>> {
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

    try {
        const result = await dossierService.findById(parsedId.data);

        if (!result.ok) {
            if (result.error === "NOT_FOUND") {
                return apiError(
                    404,
                    "NOT_FOUND",
                    "The requested dossier was not found.",
                );
            }

            return apiError(
                400,
                "VALIDATION_ERROR",
                "The dossier request is invalid.",
                { id: result.issues },
            );
        }

        return NextResponse.json({ data: result.data });
    } catch (error) {
        console.error("Failed to retrieve dossier", {
            code: "DOSSIER_RETRIEVAL_FAILED",
            dossierId: parsedId.data,
            error:
                error instanceof Error ? error.message : "Unknown error",
        });

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The dossier could not be retrieved.",
        );
    }
}