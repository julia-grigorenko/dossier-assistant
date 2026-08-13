import { z } from "zod";

export const createDossierSchema = z
    .object({
        fullName: z.string().trim().min(1).max(200),
        email: z.string().trim().email().max(320),
        companyName: z.string().trim().min(1).max(200),
        originalRequest: z.string().trim().min(10).max(10_000),
    })
    .strict();

export type ValidatedCreateDossierInput = z.infer<
    typeof createDossierSchema
>;