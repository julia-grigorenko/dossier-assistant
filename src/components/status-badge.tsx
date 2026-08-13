import type { DossierStatus } from "@/domain/dossier/dossier.types";

interface StatusBadgeProps {
    status: DossierStatus;
}

const STATUS_LABELS: Record<DossierStatus, string> = {
    PROCESSING: "Processing",
    READY: "Ready",
    NEEDS_REVIEW: "Needs review",
    PROCESSING_FAILED: "Processing failed",
    APPROVED: "Approved",
};

const STATUS_STYLES: Record<DossierStatus, string> = {
    PROCESSING: "bg-blue-100 text-blue-800",
    READY: "bg-emerald-100 text-emerald-800",
    NEEDS_REVIEW: "bg-amber-100 text-amber-900",
    PROCESSING_FAILED: "bg-red-100 text-red-800",
    APPROVED: "bg-violet-100 text-violet-800",
};

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                STATUS_STYLES[status],
            ].join(" ")}
        >
      {STATUS_LABELS[status]}
    </span>
    );
}