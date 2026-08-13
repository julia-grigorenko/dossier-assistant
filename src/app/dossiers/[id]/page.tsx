import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
const dossierIdSchema = z.string().uuid();

import { StatusBadge } from "@/components/status-badge";
import type {
    Dossier,
    RequestType,
} from "@/domain/dossier/dossier.types";
import { dossierService } from "@/services/dossier.service";

export const dynamic = "force-dynamic";

interface DossierPageProps {
    params: Promise<{
        id: string;
    }>;
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
});

function formatRequestType(value: RequestType): string {
    return value
        .toLowerCase()
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(" ");
}

function formatNullableNumber(
    value: number | null,
): string {
    return value === null ? "Not provided" : String(value);
}

function formatNullableAmount(
    value: number | null,
): string {
    return value === null
        ? "Not provided"
        : currencyFormatter.format(value);
}

export async function generateMetadata({
                                           params,
                                       }: DossierPageProps): Promise<Metadata> {
    const { id } = await params;

    return {
        title: `Dossier ${id.slice(0, 8)} | Dossier Assistant`,
    };
}

export default async function DossierPage({
                                              params,
                                          }: DossierPageProps) {
    const { id } = await params;
    const parsedId = dossierIdSchema.safeParse(id);

    if (!parsedId.success) {
        notFound();
    }

    const result = await dossierService.findById(parsedId.data);

    if (!result.ok) {
        notFound();
    }

    const dossier = result.data;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/dashboard"
                    className="text-sm font-medium text-blue-700 hover:underline"
                >
                    ← Back to dashboard
                </Link>

                <header className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            {dossier.fullName}
                        </h1>

                        <p className="mt-2 text-slate-600">
                            {dossier.companyName}
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-500">
                            Dossier ID: {dossier.id}
                        </p>
                    </div>

                    <StatusBadge status={dossier.status} />
                </header>

                <StatusExplanation dossier={dossier} />

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-950">
                            Original request
                        </h2>

                        <p className="mt-4 whitespace-pre-wrap text-slate-700">
                            {dossier.originalRequest}
                        </p>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-950">
                            Contact details
                        </h2>

                        <dl className="mt-4 space-y-4">
                            <Detail
                                label="Full name"
                                value={dossier.fullName}
                            />
                            <Detail
                                label="Email"
                                value={dossier.email}
                            />
                            <Detail
                                label="Company"
                                value={dossier.companyName}
                            />
                            <Detail
                                label="Created"
                                value={dateFormatter.format(
                                    new Date(dossier.createdAt),
                                )}
                            />
                        </dl>
                    </section>
                </div>

                {dossier.analysis ? (
                    <div className="mt-6 space-y-6">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-950">
                                Extracted analysis
                            </h2>

                            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                <Detail
                                    label="Request type"
                                    value={formatRequestType(
                                        dossier.analysis.requestType,
                                    )}
                                />

                                <Detail
                                    label="Requested amount"
                                    value={formatNullableAmount(
                                        dossier.analysis.requestedAmount,
                                    )}
                                />

                                <Detail
                                    label="Annual revenue"
                                    value={formatNullableAmount(
                                        dossier.analysis.annualRevenue,
                                    )}
                                />

                                <Detail
                                    label="Company age"
                                    value={
                                        dossier.analysis.companyAgeYears === null
                                            ? "Not provided"
                                            : `${formatNullableNumber(
                                                dossier.analysis.companyAgeYears,
                                            )} years`
                                    }
                                />

                                <Detail
                                    label="Urgency"
                                    value={
                                        dossier.analysis.urgency ??
                                        "Not provided"
                                    }
                                />

                                <Detail
                                    label="Confidence"
                                    value={`${Math.round(
                                        dossier.analysis.confidence * 100,
                                    )}%`}
                                />
                            </dl>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-950">
                                AI summary
                            </h2>

                            <p className="mt-4 whitespace-pre-wrap text-slate-700">
                                {dossier.analysis.summary}
                            </p>
                        </section>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <StringList
                                title="Missing fields"
                                items={dossier.analysis.missingFields}
                                emptyMessage="No missing fields were reported."
                            />

                            <StringList
                                title="Validation warnings"
                                items={dossier.validationWarnings}
                                emptyMessage="No validation warnings were reported."
                            />
                        </div>
                    </div>
                ) : (
                    <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
                        <h2 className="text-lg font-semibold text-blue-950">
                            Analysis not available
                        </h2>

                        <p className="mt-2 text-sm text-blue-900">
                            The original request has been stored, but no
                            structured analysis is available yet.
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}

function StatusExplanation({
                               dossier,
                           }: {
    dossier: Dossier;
}) {
    if (dossier.status === "PROCESSING") {
        return (
            <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                This dossier is waiting for automated analysis. The
                original customer request is safely stored.
            </div>
        );
    }

    if (dossier.status === "PROCESSING_FAILED") {
        return (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-semibold">
                    Automated processing failed.
                </p>

                <p className="mt-1">
                    The customer request remains stored and can be retried
                    or reviewed manually.
                </p>

                {dossier.processingError && (
                    <p className="mt-2">
                        Reason: {dossier.processingError}
                    </p>
                )}
            </div>
        );
    }

    if (dossier.status === "NEEDS_REVIEW") {
        return (
            <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                This dossier contains missing, uncertain, or invalid
                information and requires employee review.
            </div>
        );
    }

    if (dossier.status === "APPROVED") {
        return (
            <div className="mt-6 rounded-md border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                This dossier was explicitly approved
                {dossier.approvedAt
                    ? ` on ${dateFormatter.format(
                        new Date(dossier.approvedAt),
                    )}.`
                    : "."}
            </div>
        );
    }

    return null;
}

function Detail({
                    label,
                    value,
                }: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <dt className="text-sm font-medium text-slate-500">
                {label}
            </dt>
            <dd className="mt-1 break-words text-slate-950">
                {value}
            </dd>
        </div>
    );
}

function StringList({
                        title,
                        items,
                        emptyMessage,
                    }: {
    title: string;
    items: string[];
    emptyMessage: string;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
                {title}
            </h2>

            {items.length > 0 ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {items.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-sm text-slate-500">
                    {emptyMessage}
                </p>
            )}
        </section>
    );
}