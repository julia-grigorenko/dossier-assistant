"use client";

import { useRouter } from "next/navigation";
import {
    type ChangeEvent,
    type FormEvent,
    useState,
} from "react";

import { persistableAnalysisSchema } from "@/domain/dossier/analysis.schema";
import type {
    Dossier,
    RequestType,
    Urgency,
} from "@/domain/dossier/dossier.types";

interface DossierReviewFormProps {
    dossier: Dossier;
}

interface FormValues {
    requestType: RequestType;
    requestedAmount: string;
    annualRevenue: string;
    companyAgeYears: string;
    urgency: Urgency | "";
    summary: string;
    missingFields: string;
    confidence: string;
}

interface ApiResponse {
    data?: Dossier;
    error?: {
        code?: string;
        message?: string;
        fields?: Record<string, string[]>;
    };
}

type ActionState =
    | { status: "idle" }
    | { status: "saving" }
    | { status: "approving" }
    | { status: "success"; message: string }
    | { status: "error"; message: string };

function nullableNumber(value: string): number | null {
    const trimmed = value.trim();

    return trimmed === "" ? null : Number(trimmed);
}

function initialValues(dossier: Dossier): FormValues | null {
    if (!dossier.analysis) {
        return null;
    }

    return {
        requestType: dossier.analysis.requestType,
        requestedAmount:
            dossier.analysis.requestedAmount?.toString() ?? "",
        annualRevenue:
            dossier.analysis.annualRevenue?.toString() ?? "",
        companyAgeYears:
            dossier.analysis.companyAgeYears?.toString() ?? "",
        urgency: dossier.analysis.urgency ?? "",
        summary: dossier.analysis.summary,
        missingFields:
            dossier.analysis.missingFields.join(", "),
        confidence: dossier.analysis.confidence.toString(),
    };
}

function fieldsMessage(
    fields?: Record<string, string[]>,
): string | undefined {
    if (!fields) {
        return undefined;
    }

    return Object.values(fields).flat()[0];
}

export function DossierReviewForm({
                                      dossier,
                                  }: DossierReviewFormProps) {
    const router = useRouter();
    const startingValues = initialValues(dossier);

    const [values, setValues] = useState<FormValues | null>(
        startingValues,
    );
    const [state, setState] = useState<ActionState>({
        status: "idle",
    });

    const pending =
        state.status === "saving" ||
        state.status === "approving";

    const approved = dossier.status === "APPROVED";

    if (!values) {
        return (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">
                    Corrections and approval
                </h2>

                <p className="mt-3 text-sm text-slate-600">
                    There is no validated analysis to correct or approve
                    yet.
                </p>
            </section>
        );
    }

    function handleChange(
        event: ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) {
        const field = event.target.name as keyof FormValues;

        setValues((current) =>
            current
                ? {
                    ...current,
                    [field]: event.target.value,
                }
                : current,
        );

        if (state.status === "error") {
            setState({ status: "idle" });
        }
    }

    function buildPayload() {
        if (!values) {
            return null;
        }

        const payload = {
            requestType: values.requestType,
            requestedAmount: nullableNumber(
                values.requestedAmount,
            ),
            annualRevenue: nullableNumber(values.annualRevenue),
            companyAgeYears: nullableNumber(
                values.companyAgeYears,
            ),
            urgency: values.urgency || null,
            summary: values.summary.trim(),
            missingFields: values.missingFields
                .split(",")
                .map((field) => field.trim())
                .filter(Boolean),
            confidence: Number(values.confidence),
        };

        return persistableAnalysisSchema.safeParse(payload);
    }

    async function handleSave(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (pending || approved) {
            return;
        }

        const parsed = buildPayload();

        if (!parsed || !parsed.success) {
            setState({
                status: "error",
                message:
                    parsed && !parsed.success
                        ? parsed.error.issues[0]?.message ??
                        "The corrected analysis is invalid."
                        : "Analysis is unavailable.",
            });
            return;
        }

        setState({ status: "saving" });

        try {
            const response = await fetch(
                `/api/dossiers/${dossier.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(parsed.data),
                },
            );

            const body = (await response.json()) as ApiResponse;

            if (!response.ok) {
                setState({
                    status: "error",
                    message:
                        fieldsMessage(body.error?.fields) ??
                        body.error?.message ??
                        "The corrections could not be saved.",
                });
                return;
            }

            setState({
                status: "success",
                message: `Corrections saved. Status: ${body.data?.status ?? "updated"}.`,
            });

            router.refresh();
        } catch {
            setState({
                status: "error",
                message:
                    "Unable to reach the server. Try again.",
            });
        }
    }

    async function handleApprove() {
        if (pending || approved) {
            return;
        }

        const confirmed = window.confirm(
            "Approve this dossier? It cannot be edited afterward.",
        );

        if (!confirmed) {
            return;
        }

        setState({ status: "approving" });

        try {
            const response = await fetch(
                `/api/dossiers/${dossier.id}/approve`,
                {
                    method: "POST",
                },
            );

            const body = (await response.json()) as ApiResponse;

            if (!response.ok) {
                setState({
                    status: "error",
                    message:
                        fieldsMessage(body.error?.fields) ??
                        body.error?.message ??
                        "The dossier could not be approved.",
                });
                return;
            }

            setState({
                status: "success",
                message: "Dossier approved successfully.",
            });

            router.refresh();
        } catch {
            setState({
                status: "error",
                message:
                    "Unable to reach the server. Try again.",
            });
        }
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
                Corrections and approval
            </h2>

            <p className="mt-2 text-sm text-slate-600">
                Saving recalculates the review status. Approval is a
                separate explicit action.
            </p>

            <form onSubmit={handleSave} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Request type" htmlFor="requestType">
                        <select
                            id="requestType"
                            name="requestType"
                            value={values.requestType}
                            onChange={handleChange}
                            disabled={pending || approved}
                            className={inputClass}
                        >
                            <option value="BUSINESS_FINANCING">
                                Business financing
                            </option>
                            <option value="INSURANCE">Insurance</option>
                            <option value="LEASING">Leasing</option>
                            <option value="GENERAL">General</option>
                        </select>
                    </Field>

                    <Field label="Urgency" htmlFor="urgency">
                        <select
                            id="urgency"
                            name="urgency"
                            value={values.urgency}
                            onChange={handleChange}
                            disabled={pending || approved}
                            className={inputClass}
                        >
                            <option value="">Not provided</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </Field>

                    <Field
                        label="Requested amount"
                        htmlFor="requestedAmount"
                    >
                        <input
                            id="requestedAmount"
                            name="requestedAmount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={values.requestedAmount}
                            onChange={handleChange}
                            disabled={pending || approved}
                            className={inputClass}
                        />
                    </Field>

                    <Field
                        label="Annual revenue"
                        htmlFor="annualRevenue"
                    >
                        <input
                            id="annualRevenue"
                            name="annualRevenue"
                            type="number"
                            min="0"
                            step="0.01"
                            value={values.annualRevenue}
                            onChange={handleChange}
                            disabled={pending || approved}
                            className={inputClass}
                        />
                    </Field>

                    <Field
                        label="Company age in years"
                        htmlFor="companyAgeYears"
                    >
                        <input
                            id="companyAgeYears"
                            name="companyAgeYears"
                            type="number"
                            min="0"
                            step="1"
                            value={values.companyAgeYears}
                            onChange={handleChange}
                            disabled={pending || approved}
                            className={inputClass}
                        />
                    </Field>

                    <Field
                        label="Confidence (0–1)"
                        htmlFor="confidence"
                    >
                        <input
                            id="confidence"
                            name="confidence"
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={values.confidence}
                            onChange={handleChange}
                            disabled={pending || approved}
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label="AI summary" htmlFor="summary">
          <textarea
              id="summary"
              name="summary"
              rows={5}
              value={values.summary}
              onChange={handleChange}
              disabled={pending || approved}
              className={inputClass}
          />
                </Field>

                <Field
                    label="Missing fields"
                    htmlFor="missingFields"
                    help="Separate multiple field names with commas."
                >
                    <input
                        id="missingFields"
                        name="missingFields"
                        type="text"
                        value={values.missingFields}
                        onChange={handleChange}
                        disabled={pending || approved}
                        className={inputClass}
                    />
                </Field>

                {state.status === "error" && (
                    <div
                        role="alert"
                        className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
                    >
                        {state.message}
                    </div>
                )}

                {state.status === "success" && (
                    <div
                        role="status"
                        className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
                    >
                        {state.message}
                    </div>
                )}

                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                    <button
                        type="submit"
                        disabled={pending || approved}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {state.status === "saving"
                            ? "Saving…"
                            : "Save corrections"}
                    </button>

                    <button
                        type="button"
                        onClick={handleApprove}
                        disabled={pending || approved}
                        className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {state.status === "approving"
                            ? "Approving…"
                            : approved
                                ? "Approved"
                                : "Approve dossier"}
                    </button>
                </div>
            </form>
        </section>
    );
}

function Field({
                   label,
                   htmlFor,
                   help,
                   children,
               }: {
    label: string;
    htmlFor: string;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-1 block text-sm font-medium text-slate-800"
            >
                {label}
            </label>

            {children}

            {help && (
                <p className="mt-1 text-xs text-slate-500">
                    {help}
                </p>
            )}
        </div>
    );
}

const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100";