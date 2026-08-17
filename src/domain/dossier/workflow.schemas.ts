import { z } from "zod";

import { extractedAnalysisSchema } from "./analysis.schema";

export const workflowTriggerSchema = z
    .object({
        dossierId: z.string().uuid(),
        processingToken: z.string().uuid(),
        contextUrl: z.string().url(),
        callbackUrl: z.string().url(),
    })
    .strict();

export const workflowContextDataSchema = z
    .object({
        id: z.string().uuid(),
        fullName: z.string().trim().min(1).max(200),
        companyName: z.string().trim().min(1).max(200),
        originalRequest: z.string().trim().min(1).max(10_000),
        processingToken: z.string().uuid(),
    })
    .strict();

export const workflowContextResponseSchema = z
    .object({
        data: workflowContextDataSchema,
    })
    .strict();

export const successCallbackSchema = z
    .object({
        processingToken: z.string().uuid(),
        outcome: z.literal("success"),

        // The envelope accepts any JSON-compatible value.
        // The callback service validates this separately with
        // extractedAnalysisSchema.
        parsedOutput: z.unknown(),

        rawOutput: z.string().max(100_000),
    })
    .strict();

export const failureCallbackSchema = z
    .object({
        processingToken: z.string().uuid(),
        outcome: z.literal("failure"),

        errorCode: z
            .string()
            .trim()
            .min(1)
            .max(100)
            .regex(
                /^[A-Z][A-Z0-9_]*$/,
                "Error code must use uppercase letters, numbers, and underscores.",
            ),

        errorMessage: z.string().trim().min(1).max(1_000),

        rawOutput: z.string().nullable(),
    })
    .strict();

export const workflowCallbackSchema = z.discriminatedUnion(
    "outcome",
    [
        successCallbackSchema,
        failureCallbackSchema,
    ],
);