"use client";

import Link from "next/link";
import {
    type ChangeEvent,
    type FormEvent,
    useState,
} from "react";

import {
    createDossierSchema,
    type ValidatedCreateDossierInput,
} from "@/domain/dossier/dossier.schemas";
import type { Dossier } from "@/domain/dossier/dossier.types";

type FormValues = ValidatedCreateDossierInput;
type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string[]>>;

type SubmissionState =
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "validation-error" }
    | { status: "server-error"; message: string }
    | { status: "success"; dossier: Dossier };

interface ErrorResponse {
    error?: {
        code?: string;
        message?: string;
        fields?: Record<string, string[]>;
    };
}

interface SuccessResponse {
    data: Dossier;
}

const INITIAL_VALUES: FormValues = {
    fullName: "",
    email: "",
    companyName: "",
    originalRequest: "",
};

function getClientErrors(values: FormValues): FieldErrors {
    const result = createDossierSchema.safeParse(values);

    if (result.success) {
        return {};
    }

    const flattened = result.error.flatten().fieldErrors;

    return {
        fullName: flattened.fullName,
        email: flattened.email,
        companyName: flattened.companyName,
        originalRequest: flattened.originalRequest,
    };
}

export function IntakeForm() {
    const [values, setValues] =
        useState<FormValues>(INITIAL_VALUES);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submission, setSubmission] =
        useState<SubmissionState>({ status: "idle" });

    const isSubmitting = submission.status === "submitting";

    function handleChange(
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) {
        const field = event.target.name as FieldName;
        const value = event.target.value;

        setValues((current) => ({
            ...current,
            [field]: value,
        }));

        // Remove the old error while the user corrects this field.
        setErrors((current) => ({
            ...current,
            [field]: undefined,
        }));

        if (submission.status === "validation-error") {
            setSubmission({ status: "idle" });
        }
    }

    function handleBlur(
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) {
        const field = event.target.name as FieldName;
        const nextErrors = getClientErrors(values);

        setErrors((current) => ({
            ...current,
            [field]: nextErrors[field],
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const parsed = createDossierSchema.safeParse(values);

        if (!parsed.success) {
            const flattened = parsed.error.flatten().fieldErrors;

            setErrors({
                fullName: flattened.fullName,
                email: flattened.email,
                companyName: flattened.companyName,
                originalRequest: flattened.originalRequest,
            });

            setSubmission({ status: "validation-error" });
            return;
        }

        setErrors({});
        setSubmission({ status: "submitting" });

        try {
            const response = await fetch("/api/dossiers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(parsed.data),
            });

            const responseBody: unknown = await response.json();

            if (!response.ok) {
                const apiError = responseBody as ErrorResponse;

                if (
                    response.status === 400 &&
                    apiError.error?.code === "VALIDATION_ERROR"
                ) {
                    const serverFields = apiError.error.fields ?? {};

                    setErrors({
                        fullName: serverFields.fullName,
                        email: serverFields.email,
                        companyName: serverFields.companyName,
                        originalRequest: serverFields.originalRequest,
                    });

                    setSubmission({ status: "validation-error" });
                    return;
                }

                setSubmission({
                    status: "server-error",
                    message:
                        apiError.error?.message ??
                        "The request could not be submitted.",
                });

                return;
            }

            const success = responseBody as SuccessResponse;

            if (!success.data?.id) {
                throw new Error("The server returned an invalid response.");
            }

            setSubmission({
                status: "success",
                dossier: success.data,
            });

            // Clear only after the server confirms successful creation.
            setValues(INITIAL_VALUES);
        } catch {
            setSubmission({
                status: "server-error",
                message:
                    "Unable to reach the server. Check your connection and try again.",
            });
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6"
        >
            <FormField
                id="fullName"
                label="Full name"
                error={errors.fullName?.[0]}
            >
                <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={values.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={
                        errors.fullName ? "fullName-error" : undefined
                    }
                    className={inputClass(Boolean(errors.fullName))}
                />
            </FormField>

            <FormField
                id="email"
                label="Email"
                error={errors.email?.[0]}
            >
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                        errors.email ? "email-error" : undefined
                    }
                    className={inputClass(Boolean(errors.email))}
                />
            </FormField>

            <FormField
                id="companyName"
                label="Company name"
                error={errors.companyName?.[0]}
            >
                <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    autoComplete="organization"
                    value={values.companyName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.companyName)}
                    aria-describedby={
                        errors.companyName
                            ? "companyName-error"
                            : undefined
                    }
                    className={inputClass(Boolean(errors.companyName))}
                />
            </FormField>

            <FormField
                id="originalRequest"
                label="Describe your request"
                error={errors.originalRequest?.[0]}
            >
        <textarea
            id="originalRequest"
            name="originalRequest"
            rows={7}
            value={values.originalRequest}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.originalRequest)}
            aria-describedby={
                errors.originalRequest
                    ? "originalRequest-error"
                    : "originalRequest-help"
            }
            className={inputClass(Boolean(errors.originalRequest))}
        />

                {!errors.originalRequest && (
                    <p
                        id="originalRequest-help"
                        className="mt-1 text-sm text-slate-500"
                    >
                        Include the purpose, relevant amounts, urgency, and
                        business details when available.
                    </p>
                )}
            </FormField>

            {submission.status === "validation-error" && (
                <div
                    role="alert"
                    className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
                >
                    Please correct the highlighted fields.
                </div>
            )}

            {submission.status === "server-error" && (
                <div
                    role="alert"
                    className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
                >
                    {submission.message}
                </div>
            )}

            {submission.status === "success" && (
                <div
                    role="status"
                    className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-950"
                >
                    <p className="font-semibold">
                        Your request was submitted successfully.
                    </p>

                    <dl className="mt-3 space-y-1 text-sm">
                        <div>
                            <dt className="inline font-medium">Dossier ID: </dt>
                            <dd className="inline break-all">
                                {submission.dossier.id}
                            </dd>
                        </div>

                        <div>
                            <dt className="inline font-medium">Status: </dt>
                            <dd className="inline">
                                {submission.dossier.status}
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                        <Link
                            href={`/dossiers/${submission.dossier.id}`}
                            className="text-emerald-800 underline"
                        >
                            Open dossier
                        </Link>

                        <Link
                            href="/dashboard"
                            className="text-emerald-800 underline"
                        >
                            View dashboard
                        </Link>
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isSubmitting ? "Submitting…" : "Submit request"}
            </button>
        </form>
    );
}

interface FormFieldProps {
    id: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}

function FormField({
                       id,
                       label,
                       error,
                       children,
                   }: FormFieldProps) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block font-medium text-slate-900"
            >
                {label}
            </label>

            {children}

            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-1 text-sm text-red-700"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

function inputClass(hasError: boolean): string {
    return [
        "w-full rounded-md border bg-white px-3 py-2 text-slate-950",
        "outline-none focus:ring-2",
        hasError
            ? "border-red-500 focus:ring-red-200"
            : "border-slate-300 focus:border-slate-600 focus:ring-slate-200",
        "disabled:cursor-not-allowed disabled:bg-slate-100",
    ].join(" ");
}