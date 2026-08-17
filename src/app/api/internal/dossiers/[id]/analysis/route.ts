import {
    workflowCallbackSchema,
} from "@/domain/dossier/workflow.schemas";
import {
    apiError,
    issuesToFields,
} from "@/lib/api-response";
import {
    requireInternalAuthorization,
} from "@/lib/internal-auth";
import {
    analysisCallbackService,
} from "@/services/analysis-callback.service";
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

export async function POST(
    request: NextRequest,
    context: RouteContext,
): Promise<Response> {
    // Authenticate before validating or looking up the dossier.
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

    const parsedCallback =
        workflowCallbackSchema.safeParse(body);

    if (!parsedCallback.success) {
        const issues =
            parsedCallback.error.issues.map((issue) => {
                const path = issue.path.join(".");

                return path
                    ? `${path}: ${issue.message}`
                    : issue.message;
            });

        return apiError(
            400,
            "VALIDATION_ERROR",
            "The callback envelope is invalid.",
            issuesToFields(issues),
        );
    }

    try {
        const result =
            await analysisCallbackService.process(
                parsedId.data,
                parsedCallback.data,
            );

        if (result.ok) {
            return NextResponse.json(
                {
                    data: result.data,
                    meta: result.meta,
                },
                {
                    status: 200,
                },
            );
        }

        if (result.error === "NOT_FOUND") {
            return apiError(
                404,
                "NOT_FOUND",
                "The requested dossier was not found.",
            );
        }

        if (result.error === "TOKEN_MISMATCH") {
            return apiError(
                409,
                "INVALID_STATE",
                "The callback does not match the active processing attempt.",
            );
        }

        if (
            result.error === "INVALID_STATE" ||
            result.error === "UPDATE_CONFLICT"
        ) {
            return apiError(
                409,
                "INVALID_STATE",
                result.message,
            );
        }

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The callback could not be processed.",
        );
    } catch (error) {
        console.error("Analysis callback failed", {
            code: "ANALYSIS_CALLBACK_FAILED",
            dossierId: parsedId.data,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error",
        });

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The callback could not be processed.",
        );
    }
}