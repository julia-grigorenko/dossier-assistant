import { NextResponse } from "next/server";

export type ApiErrorCode =
    | "INVALID_JSON"
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "INTERNAL_ERROR";

export interface ApiErrorBody {
    error: {
        code: ApiErrorCode;
        message: string;
        fields?: Record<string, string[]>;
    };
}

export function apiError(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string[]>,
): NextResponse<ApiErrorBody> {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                ...(fields ? { fields } : {}),
            },
        },
        { status },
    );
}