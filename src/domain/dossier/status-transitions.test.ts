import { describe, expect, it } from "vitest";

import {
    assertStatusTransition,
    canTransitionStatus,
} from "./status-transitions";

describe("status transitions", () => {
    it("allows an analysis result to become ready", () => {
        expect(canTransitionStatus("PROCESSING", "READY")).toBe(true);
    });

    it("allows an analysis failure", () => {
        expect(
            canTransitionStatus("PROCESSING", "PROCESSING_FAILED"),
        ).toBe(true);
    });

    it("allows retrying a failed workflow", () => {
        expect(
            canTransitionStatus("PROCESSING_FAILED", "PROCESSING"),
        ).toBe(true);
    });

    it("allows explicit approval after review", () => {
        expect(canTransitionStatus("NEEDS_REVIEW", "APPROVED")).toBe(true);
    });

    it("does not allow AI processing to approve a dossier", () => {
        expect(canTransitionStatus("PROCESSING", "APPROVED")).toBe(false);
    });

    it("does not allow changes after approval", () => {
        expect(canTransitionStatus("APPROVED", "READY")).toBe(false);
    });

    it("throws for an invalid transition", () => {
        expect(() =>
            assertStatusTransition("APPROVED", "PROCESSING"),
        ).toThrow("Invalid dossier status transition");
    });
});