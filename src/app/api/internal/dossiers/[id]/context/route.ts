import type {
    WorkflowContextResponse,
} from "@/domain/dossier/workflow.types";
import {
    apiError,
    type ApiErrorBody,
} from "@/lib/api-response";
import {
    requireInternalAuthorization,
} from "@/lib/internal-auth";
import {
    dossierService,
} from "@/services/dossier.service";
import {
    NextRequest,
    NextResponse,
} from "next/server";
import { z } from "zod";

const dossierIdSchema = z.string().uuid();

interface RouteContext {
    params: Promise<{
        id: string;
    }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext,
): Promise<
    NextResponse<WorkflowContextResponse | ApiErrorBody>
> {
    // Authenticate first so an untrusted caller cannot probe
    // whether dossier IDs are valid or exist.
    const authorizationError =
        requireInternalAuthorization(request);

    if (authorizationError) {
        return authorizationError;
    }

    const { id } = await context.params;
    const parsedId = dossierIdSchema.safeParse(id);

    if (!parsedId.success) {
        return apiError(
            400,
            "VALIDATION_ERROR",
            "The dossier ID is invalid.",
            {
                id: [
                    "The dossier ID must be a valid UUID.",
                ],
            },
        );
    }

    try {
        const result =
            await dossierService.getProcessingContext(
                parsedId.data,
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
                "The dossier context is unavailable in its current state.",
                {
                    _form: result.issues,
                },
            );
        }

        return NextResponse.json({
            data: result.data,
        });
    } catch (error) {
        console.error(
            "Failed to retrieve internal dossier context",
            {
                code: "DOSSIER_CONTEXT_RETRIEVAL_FAILED",
                dossierId: parsedId.data,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            },
        );

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The dossier context could not be retrieved.",
        );
    }
}