import type { DossierStatus } from "./dossier.types";

const ALLOWED_TRANSITIONS = {
    PROCESSING: [
        "READY",
        "NEEDS_REVIEW",
        "PROCESSING_FAILED",
    ],
    READY: [
        "READY",
        "NEEDS_REVIEW",
        "APPROVED",
    ],
    NEEDS_REVIEW: [
        "READY",
        "NEEDS_REVIEW",
        "APPROVED",
    ],
    PROCESSING_FAILED: ["PROCESSING"],
    APPROVED: [],
} as const satisfies Record<DossierStatus, readonly DossierStatus[]>;

export function canTransitionStatus(
    from: DossierStatus,
    to: DossierStatus,
): boolean {
    const allowed: readonly DossierStatus[] =
        ALLOWED_TRANSITIONS[from];

    return allowed.includes(to);
}

export function assertStatusTransition(
    from: DossierStatus,
    to: DossierStatus,
): void {
    if (!canTransitionStatus(from, to)) {
        throw new Error(
            `Invalid dossier status transition: ${from} -> ${to}`,
        );
    }
}