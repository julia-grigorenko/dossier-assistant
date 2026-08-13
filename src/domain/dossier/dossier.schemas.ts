import { z } from "zod";
import { DOSSIER_STATUSES } from "./dossier.types";

export const dossierStatusSchema = z.enum(DOSSIER_STATUSES);
export const createDossierSchema = z
    .object({
        fullName: z.string().trim().min(1, "Full name is required.")
            .max(200, "Full name must not exceed 200 characters."),
        email: z.string().trim().min(1, "Email is required.")
            .email("Enter a valid email address.")
            .max(320, "Email must not exceed 320 characters."),
        companyName: z.string().trim().min(1, "Company name is required.")
            .max(200, "Company name must not exceed 200 characters."),
        originalRequest: z.string().trim().min(10, "Describe your request using at least 10 characters.")
            .max(10_000, "The request must not exceed 10,000 characters."),
    })
    .strict();

export type ValidatedCreateDossierInput = z.infer<
    typeof createDossierSchema
>;