import "server-only";

import type {
    Dossier,
    DossierResult,
} from "@/domain/dossier/dossier.types";

import { dossierService } from "./dossier.service";
import { triggerAnalysis } from "./n8n.client";

export const dossierWorkflowService = {
    async createAndTrigger(
        input: unknown,
    ): Promise<DossierResult<Dossier>> {
        const created =
            await dossierService.createForWorkflow(input);

        if (!created.ok) {
            return created;
        }

        const {
            dossier,
            processingToken,
        } = created.data;

        try {
            await triggerAnalysis({
                dossierId: dossier.id,
                processingToken,
            });

            return {
                ok: true,
                data: dossier,
            };
        } catch {
            console.error(
                "Failed to trigger dossier workflow",
                {
                    code: "WORKFLOW_TRIGGER_FAILED",
                    dossierId: dossier.id,
                },
            );

            return dossierService.markWorkflowTriggerFailed(
                dossier.id,
                processingToken,
            );
        }
    },
};