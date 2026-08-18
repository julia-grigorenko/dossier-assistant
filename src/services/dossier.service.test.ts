import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
    "@/repositories/dossier.repository",
    () => ({
        dossierRepository: {
            create: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findProcessingContext: vi.fn(),
            updateAnalysis: vi.fn(),
            updateStatus: vi.fn(),
            approve: vi.fn(),
            markWorkflowTriggerFailed: vi.fn(),
        },
    }),
);

import type {
    Dossier,
} from "@/domain/dossier/dossier.types";
import {
    dossierRepository,
} from "@/repositories/dossier.repository";
import {
    dossierService,
} from "./dossier.service";

const dossierId = "a4142611-25c3-4ca5-aaf0-049b013a9336";
const processingToken = "57cf75f5-1f96-4f25-b91d-183c529ec32d";

const dossierFixture: Dossier = {
    id: dossierId,
    fullName: "Alex Morgan",
    email: "alex@example.com",
    companyName: "Northwind Studio",
    originalRequest:
        "We need financing for new equipment.",
    status: "PROCESSING",
    analysis: null,
    validationWarnings: [],
    processingError: null,
    createdAt: "2026-08-18T10:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
    approvedAt: null,
};


const findProcessingContextMock = vi.mocked(
    dossierRepository.findProcessingContext,
);

describe("dossierService.getProcessingContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns NOT_FOUND when the dossier does not exist", async () => {
        findProcessingContextMock.mockResolvedValue(null);

        const result =
            await dossierService.getProcessingContext(
                dossierId,
            );

        expect(result).toEqual({
            ok: false,
            error: "NOT_FOUND",
        });
    });

    it("rejects a dossier that is not processing", async () => {
        findProcessingContextMock.mockResolvedValue({
            id: dossierId,
            fullName: "Alex Morgan",
            companyName: "Northwind Studio",
            originalRequest: "We need financing.",
            status: "READY",
            processingToken,
        });

        const result =
            await dossierService.getProcessingContext(
                dossierId,
            );

        expect(result).toEqual({
            ok: false,
            error: "VALIDATION_ERROR",
            issues: [
                "Dossier context is unavailable while status is READY.",
            ],
        });
    });

    it("rejects a processing dossier without a processing token", async () => {
        findProcessingContextMock.mockResolvedValue({
            id: dossierId,
            fullName: "Alex Morgan",
            companyName: "Northwind Studio",
            originalRequest: "We need financing.",
            status: "PROCESSING",
            processingToken: null,
        });

        const result =
            await dossierService.getProcessingContext(
                dossierId,
            );

        expect(
            findProcessingContextMock,
        ).toHaveBeenCalledWith(dossierId);

        expect(result).toEqual({
            ok: false,
            error: "VALIDATION_ERROR",
            issues: [
                "The processing dossier does not have a processing token.",
            ],
        });
    });

    it("returns the minimal workflow context for a processing dossier", async () => {
        findProcessingContextMock.mockResolvedValue({
            id: dossierId,
            fullName: "Alex Morgan",
            companyName: "Northwind Studio",
            originalRequest: "We need financing.",
            status: "PROCESSING",
            processingToken,
        });

        const result =
            await dossierService.getProcessingContext(
                dossierId,
            );

        expect(result).toEqual({
            ok: true,
            data: {
                id: dossierId,
                fullName: "Alex Morgan",
                companyName: "Northwind Studio",
                originalRequest: "We need financing.",
                processingToken,
            },
        });
    });
});

describe("dossierService creation", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(
            dossierRepository.create,
        ).mockResolvedValue({
            dossier: dossierFixture,
            processingToken,
        });
    });

    it("creates a dossier without exposing the processing token", async () => {
        const result = await dossierService.create({
            fullName: "Alex Morgan",
            email: "alex@example.com",
            companyName: "Northwind Studio",
            originalRequest:
                "We need financing for new equipment.",
        });

        expect(
            dossierRepository.create,
        ).toHaveBeenCalledOnce();

        expect(result).toEqual({
            ok: true,
            data: dossierFixture,
        });

        if (result.ok) {
            expect(result.data).not.toHaveProperty(
                "processingToken",
            );
        }
    });

    it("returns the processing token for internal workflow creation", async () => {
        const result =
            await dossierService.createForWorkflow({
                fullName: "Alex Morgan",
                email: "alex@example.com",
                companyName: "Northwind Studio",
                originalRequest:
                    "We need financing for new equipment.",
            });

        expect(result).toEqual({
            ok: true,
            data: {
                dossier: dossierFixture,
                processingToken,
            },
        });
    });
});