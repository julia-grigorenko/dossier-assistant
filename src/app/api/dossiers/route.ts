import { dossierStatusSchema } from "@/domain/dossier/dossier.schemas";
import type { Dossier } from "@/domain/dossier/dossier.types";
import {
    apiError,
    type ApiErrorBody,
} from "@/lib/api-response";
import { dossierService } from "@/services/dossier.service";
import { NextRequest, NextResponse } from "next/server";

interface DossierResponse {
    data: Dossier;
}

interface DossierListResponse {
    data: Dossier[];
}

function toFields(
    issues: string[],
): Record<string, string[]> {
    const fields: Record<string, string[]> = {};

    for (const issue of issues) {
        const separator = issue.indexOf(":");
        const field =
            separator === -1 ? "_form" : issue.slice(0, separator);
        const message =
            separator === -1
                ? issue
                : issue.slice(separator + 1).trim();

        fields[field] ??= [];
        fields[field].push(message);
    }

    return fields;
}

export async function POST(
    request: NextRequest,
): Promise<NextResponse<DossierResponse | ApiErrorBody>> {
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

    try {
        const result = await dossierService.create(body);

        if (!result.ok) {
            if (result.error === "VALIDATION_ERROR") {
                return apiError(
                    400,
                    "VALIDATION_ERROR",
                    "The submitted data is invalid.",
                    toFields(result.issues),
                );
            }

            return apiError(
                404,
                "NOT_FOUND",
                "The requested dossier was not found.",
            );
        }

        return NextResponse.json(
            { data: result.data },
            { status: 201 },
        );
    } catch (error) {
        console.error("Failed to create dossier", {
            code: "DOSSIER_CREATE_FAILED",
            error:
                error instanceof Error ? error.message : "Unknown error",
        });

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The dossier could not be created.",
        );
    }
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<DossierListResponse | ApiErrorBody>> {
    const rawStatus = request.nextUrl.searchParams.get("status");

    let status:
        | Parameters<typeof dossierService.findAll>[0]
        | undefined;

    if (rawStatus !== null) {
        const parsed = dossierStatusSchema.safeParse(rawStatus);

        if (!parsed.success) {
            return apiError(
                400,
                "VALIDATION_ERROR",
                "The status filter is invalid.",
                {
                    status: [
                        "Use PROCESSING, READY, NEEDS_REVIEW, PROCESSING_FAILED, or APPROVED.",
                    ],
                },
            );
        }

        status = parsed.data;
    }

    try {
        const dossiers = await dossierService.findAll(status);

        return NextResponse.json({ data: dossiers });
    } catch (error) {
        console.error("Failed to list dossiers", {
            code: "DOSSIER_LIST_FAILED",
            error:
                error instanceof Error ? error.message : "Unknown error",
        });

        return apiError(
            500,
            "INTERNAL_ERROR",
            "The dossiers could not be retrieved.",
        );
    }
}