import type { Metadata } from "next";
import Link from "next/link";

import { DossierList } from "@/components/dossier-list";
import { dossierStatusSchema } from "@/domain/dossier/dossier.schemas";
import type { DossierStatus } from "@/domain/dossier/dossier.types";
import { dossierService } from "@/services/dossier.service";

export const metadata: Metadata = {
    title: "Dashboard | Dossier Assistant",
    description: "Review and manage client dossiers.",
};

export const dynamic = "force-dynamic";

interface DashboardPageProps {
    searchParams: Promise<{
        status?: string | string[];
    }>;
}

const STATUS_OPTIONS: Array<{
    value: DossierStatus;
    label: string;
}> = [
    { value: "PROCESSING", label: "Processing" },
    { value: "READY", label: "Ready" },
    { value: "NEEDS_REVIEW", label: "Needs review" },
    {
        value: "PROCESSING_FAILED",
        label: "Processing failed",
    },
    { value: "APPROVED", label: "Approved" },
];

export default async function DashboardPage({
                                                searchParams,
                                            }: DashboardPageProps) {
    const query = await searchParams;
    const rawStatus = Array.isArray(query.status)
        ? query.status[0]
        : query.status;

    const parsedStatus =
        dossierStatusSchema.safeParse(rawStatus);

    const status = parsedStatus.success
        ? parsedStatus.data
        : undefined;

    const dossiers = await dossierService.findAll(status);

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Dossier dashboard
                        </h1>

                        <p className="mt-2 text-slate-600">
                            Browse customer requests and review their
                            extracted analysis.
                        </p>
                    </div>

                    <Link
                        href="/intake"
                        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                        New intake
                    </Link>
                </header>

                <form
                    action="/dashboard"
                    method="get"
                    className="mb-6 flex flex-wrap items-end gap-3"
                >
                    <div>
                        <label
                            htmlFor="status"
                            className="mb-1 block text-sm font-medium text-slate-800"
                        >
                            Status
                        </label>

                        <select
                            id="status"
                            name="status"
                            defaultValue={status ?? ""}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950"
                        >
                            <option value="">All statuses</option>

                            {STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
                    >
                        Apply filter
                    </button>

                    {status && (
                        <Link
                            href="/dashboard"
                            className="px-2 py-2 text-sm font-medium text-blue-700 hover:underline"
                        >
                            Clear filter
                        </Link>
                    )}
                </form>

                {rawStatus && !parsedStatus.success && (
                    <div
                        role="alert"
                        className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                    >
                        The supplied status filter is invalid. Showing all
                        dossiers.
                    </div>
                )}

                <DossierList dossiers={dossiers} />
            </div>
        </main>
    );
}