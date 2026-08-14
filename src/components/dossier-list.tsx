import Link from "next/link";

import type { Dossier } from "@/domain/dossier/dossier.types";

import { StatusBadge } from "./status-badge";

interface DossierListProps {
    dossiers: Dossier[];
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
});

function formatRequestType(
    requestType: Dossier["analysis"] extends null
        ? never
        : NonNullable<Dossier["analysis"]>["requestType"],
): string {
    return requestType
        .toLowerCase()
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(" ");
}

export function DossierList({
                                dossiers,
                            }: DossierListProps) {
    if (dossiers.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h2 className="text-lg font-semibold text-slate-900">
                    No dossiers found
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                    No dossiers match the current filter.
                </p>

                <Link
                    href="/intake"
                    className="mt-5 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                    Create a dossier
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                <tr>
                    <TableHeading>Customer</TableHeading>
                    <TableHeading>Company</TableHeading>
                    <TableHeading>Request type</TableHeading>
                    <TableHeading>Amount</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Created</TableHeading>
                    <TableHeading>
                        <span className="sr-only">Actions</span>
                    </TableHeading>
                </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                {dossiers.map((dossier) => (
                    <tr key={dossier.id}>
                        <TableCell>
                            <div className="font-medium text-slate-950">
                                {dossier.fullName}
                            </div>

                            <div className="text-xs text-slate-500">
                                {dossier.email}
                            </div>
                        </TableCell>

                        <TableCell>{dossier.companyName}</TableCell>

                        <TableCell>
                            {dossier.analysis
                                ? formatRequestType(
                                    dossier.analysis.requestType,
                                )
                                : "Awaiting analysis"}
                        </TableCell>

                        <TableCell>
                            {dossier.analysis?.requestedAmount !== null &&
                            dossier.analysis?.requestedAmount !== undefined
                                ? currencyFormatter.format(
                                    dossier.analysis.requestedAmount,
                                )
                                : "—"}
                        </TableCell>

                        <TableCell>
                            <StatusBadge status={dossier.status} />
                        </TableCell>

                        <TableCell>
                            <time dateTime={dossier.createdAt}>
                                {dateFormatter.format(
                                    new Date(dossier.createdAt),
                                )}
                            </time>
                        </TableCell>

                        <TableCell>
                            <Link
                                href={`/dossiers/${dossier.id}`}
                                className="font-medium text-blue-700 hover:underline"
                            >
                                Review
                            </Link>
                        </TableCell>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function TableHeading({
                          children,
                      }: {
    children: React.ReactNode;
}) {
    return (
        <th
            scope="col"
            className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
            {children}
        </th>
    );
}

function TableCell({
                       children,
                   }: {
    children: React.ReactNode;
}) {
    return (
        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
            {children}
        </td>
    );
}