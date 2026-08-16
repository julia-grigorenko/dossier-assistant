import { NextResponse } from "next/server";

export type ApiErrorCode =
    | "INVALID_JSON"
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "INVALID_STATE"
    | "UNAUTHORIZED"
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
export function issuesToFields(
    issues: string[],
): Record<string, string[]> {
    const fields: Record<string, string[]> = {};

    for (const issue of issues) {
        const separator = issue.indexOf(":");

        const field =
            separator === -1
                ? "_form"
                : issue.slice(0, separator);

        const message =
            separator === -1
                ? issue
                : issue.slice(separator + 1).trim();

        fields[field] ??= [];
        fields[field].push(message);
    }

    return fields;
}