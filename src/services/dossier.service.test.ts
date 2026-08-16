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
        },
    }),
);

import {
    dossierRepository,
} from "@/repositories/dossier.repository";
import {
    dossierService,
} from "./dossier.service";

const dossierId =
    "a4142611-25c3-4ca5-aaf0-049b013a9336";

const processingToken =
    "57cf75f5-1f96-4f25-b91d-183c529ec32d";

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