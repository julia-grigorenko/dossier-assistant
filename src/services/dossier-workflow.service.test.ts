import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("./dossier.service", () => ({
    dossierService: {
        createForWorkflow: vi.fn(),
        markWorkflowTriggerFailed: vi.fn(),
    },
}));

vi.mock("./n8n.client", () => ({
    triggerAnalysis: vi.fn(),
}));

import {
    dossierService,
} from "./dossier.service";
import {
    dossierWorkflowService,
} from "./dossier-workflow.service";
import {
    triggerAnalysis,
} from "./n8n.client";

const dossierId =
    "a4142611-25c3-4ca5-aaf0-049b013a9336";

const processingToken =
    "57cf75f5-1f96-4f25-b91d-183c529ec32d";

const processingDossier = {
    id: dossierId,
    fullName: "Alex Morgan",
    email: "alex@example.com",
    companyName: "Northwind Studio",
    originalRequest: "We need financing.",
    status: "PROCESSING" as const,
    analysis: null,
    validationWarnings: [],
    processingError: null,
    createdAt: "2026-08-17T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
    approvedAt: null,
};

const failedDossier = {
    ...processingDossier,
    status: "PROCESSING_FAILED" as const,
    processingError: "WORKFLOW_TRIGGER_FAILED",
};

const createForWorkflowMock = vi.mocked(
    dossierService.createForWorkflow,
);

const markFailedMock = vi.mocked(
    dossierService.markWorkflowTriggerFailed,
);

const triggerAnalysisMock = vi.mocked(
    triggerAnalysis,
);

describe("dossierWorkflowService", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        createForWorkflowMock.mockResolvedValue({
            ok: true,
            data: {
                dossier: processingDossier,
                processingToken,
            },
        });
    });

    it("returns PROCESSING after n8n acknowledges", async () => {
        triggerAnalysisMock.mockResolvedValue();

        const result =
            await dossierWorkflowService.createAndTrigger({
                fullName: "Alex Morgan",
            });

        expect(triggerAnalysisMock).toHaveBeenCalledWith({
            dossierId,
            processingToken,
        });

        expect(result).toEqual({
            ok: true,
            data: processingDossier,
        });

        expect(markFailedMock).not.toHaveBeenCalled();
    });

    it("preserves the dossier and marks failure when n8n does not acknowledge", async () => {
        triggerAnalysisMock.mockRejectedValue(
            new Error("Connection refused"),
        );

        markFailedMock.mockResolvedValue({
            ok: true,
            data: failedDossier,
        });

        const result =
            await dossierWorkflowService.createAndTrigger({
                fullName: "Alex Morgan",
            });

        expect(markFailedMock).toHaveBeenCalledWith(
            dossierId,
            processingToken,
        );

        expect(result).toEqual({
            ok: true,
            data: failedDossier,
        });
    });
});