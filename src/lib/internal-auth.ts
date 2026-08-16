import "server-only";

import { timingSafeEqual } from "node:crypto";

import { apiError, type ApiErrorBody } from "./api-response";

import type { NextResponse } from "next/server";

const BEARER_PATTERN = /^Bearer ([^\s]+)$/i;

function safelyEqual(
    received: string,
    expected: string,
): boolean {
    const receivedBuffer = Buffer.from(received, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (receivedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(
        receivedBuffer,
        expectedBuffer,
    );
}

export function hasValidInternalAuthorization(
    request: Request,
): boolean {
    const sharedSecret = process.env.N8N_SHARED_SECRET;

    if (!sharedSecret) {
        throw new Error("Missing N8N_SHARED_SECRET");
    }

    const authorization =
        request.headers.get("authorization");

    if (!authorization) {
        return false;
    }

    const match = authorization.match(BEARER_PATTERN);

    if (!match) {
        return false;
    }

    const receivedSecret = match[1];

    return safelyEqual(receivedSecret, sharedSecret);
}

export function requireInternalAuthorization(
    request: Request,
): NextResponse<ApiErrorBody> | null {
    if (hasValidInternalAuthorization(request)) {
        return null;
    }

    return apiError(
        401,
        "UNAUTHORIZED",
        "Authentication is required.",
    );
}