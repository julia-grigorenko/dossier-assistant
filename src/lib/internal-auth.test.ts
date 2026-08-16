import {
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import {
    hasValidInternalAuthorization,
    requireInternalAuthorization,
} from "./internal-auth";

const originalSecret =
    process.env.N8N_SHARED_SECRET;

const testSecret =
    "0123456789abcdef0123456789abcdef";

describe("internal n8n authentication", () => {
    beforeEach(() => {
        process.env.N8N_SHARED_SECRET = testSecret;
    });

    afterAll(() => {
        if (originalSecret === undefined) {
            delete process.env.N8N_SHARED_SECRET;
        } else {
            process.env.N8N_SHARED_SECRET =
                originalSecret;
        }
    });

    it("accepts the correct Bearer token", () => {
        const request = new Request(
            "http://localhost/api/internal/test",
            {
                headers: {
                    Authorization: `Bearer ${testSecret}`,
                },
            },
        );

        expect(
            hasValidInternalAuthorization(request),
        ).toBe(true);

        expect(
            requireInternalAuthorization(request),
        ).toBeNull();
    });

    it("rejects missing authorization", async () => {
        const request = new Request(
            "http://localhost/api/internal/test",
        );

        expect(
            hasValidInternalAuthorization(request),
        ).toBe(false);

        const response =
            requireInternalAuthorization(request);

        expect(response).not.toBeNull();
        expect(response?.status).toBe(401);

        await expect(response?.json()).resolves.toEqual({
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication is required.",
            },
        });
    });

    it("rejects incorrect authorization", () => {
        const request = new Request(
            "http://localhost/api/internal/test",
            {
                headers: {
                    Authorization:
                        "Bearer incorrect-secret-value",
                },
            },
        );

        expect(
            hasValidInternalAuthorization(request),
        ).toBe(false);

        expect(
            requireInternalAuthorization(request)?.status,
        ).toBe(401);
    });

    it("rejects a non-Bearer scheme", () => {
        const request = new Request(
            "http://localhost/api/internal/test",
            {
                headers: {
                    Authorization: `Basic ${testSecret}`,
                },
            },
        );

        expect(
            hasValidInternalAuthorization(request),
        ).toBe(false);
    });

    it("rejects a Bearer header without a token", () => {
        const request = new Request(
            "http://localhost/api/internal/test",
            {
                headers: {
                    Authorization: "Bearer ",
                },
            },
        );

        expect(
            hasValidInternalAuthorization(request),
        ).toBe(false);
    });
});