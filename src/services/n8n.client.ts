import "server-only";

import {
    workflowTriggerSchema,
} from "@/domain/dossier/workflow.schemas";
import type {
    AnalysisJob,
    WorkflowTrigger,
} from "@/domain/dossier/workflow.types";

const TRIGGER_TIMEOUT_MS = 5_000;

interface N8nConfiguration {
    webhookUrl: string;
    sharedSecret: string;
    appBaseUrl: string;
}

function getConfiguration(): N8nConfiguration {
    const webhookUrl =
        process.env.N8N_WEBHOOK_URL;

    const sharedSecret =
        process.env.N8N_SHARED_SECRET;

    const appBaseUrl =
        process.env.APP_BASE_URL;

    if (!webhookUrl) {
        throw new Error("Missing N8N_WEBHOOK_URL");
    }

    if (!sharedSecret) {
        throw new Error("Missing N8N_SHARED_SECRET");
    }

    if (!appBaseUrl) {
        throw new Error("Missing APP_BASE_URL");
    }

    return {
        webhookUrl,
        sharedSecret,
        appBaseUrl,
    };
}

function buildInternalUrl(
    appBaseUrl: string,
    dossierId: string,
    resource: "context" | "analysis",
): string {
    const baseUrl = appBaseUrl.endsWith("/")
        ? appBaseUrl
        : `${appBaseUrl}/`;

    return new URL(
        `api/internal/dossiers/${dossierId}/${resource}`,
        baseUrl,
    ).toString();
}

function buildTriggerPayload(
    job: AnalysisJob,
    appBaseUrl: string,
): WorkflowTrigger {
    return workflowTriggerSchema.parse({
        dossierId: job.dossierId,
        processingToken: job.processingToken,
        contextUrl: buildInternalUrl(
            appBaseUrl,
            job.dossierId,
            "context",
        ),
        callbackUrl: buildInternalUrl(
            appBaseUrl,
            job.dossierId,
            "analysis",
        ),
    });
}

export async function triggerAnalysis(
    job: AnalysisJob,
): Promise<void> {
    const configuration = getConfiguration();

    const payload = buildTriggerPayload(
        job,
        configuration.appBaseUrl,
    );

    let response: Response;

    try {
        response = await fetch(
            configuration.webhookUrl,
            {
                method: "POST",
                headers: {
                    Authorization:
                        `Bearer ${configuration.sharedSecret}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(
                    TRIGGER_TIMEOUT_MS,
                ),
            },
        );
    } catch {
        throw new Error(
            "n8n workflow acknowledgment failed",
        );
    }

    if (!response.ok) {
        throw new Error(
            `n8n workflow acknowledgment returned ${response.status}`,
        );
    }
}