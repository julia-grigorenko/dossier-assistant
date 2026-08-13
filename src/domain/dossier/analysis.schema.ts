import { z } from "zod";

import {
    REQUEST_TYPES,
    URGENCY_LEVELS,
    type ExtractedAnalysis,
} from "./dossier.types";

export const extractedAnalysisSchema: z.ZodType<ExtractedAnalysis> = z
    .object({
        requestType: z.enum(REQUEST_TYPES),
        requestedAmount: z.number().finite().nullable(),
        annualRevenue: z.number().finite().nullable(),
        companyAgeYears: z.number().int().finite().nullable(),
        urgency: z.enum(URGENCY_LEVELS).nullable(),
        summary: z.string().trim().min(1).max(1_000),
        missingFields: z.array(z.string().trim().min(1)).default([]),
        confidence: z.number().finite().min(0).max(1),
    })
    .strict();