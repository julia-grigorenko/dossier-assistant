import Link from "next/link";

export default function DossierNotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    404
                </p>

                <h1 className="mt-3 text-3xl font-bold text-slate-950">
                    Dossier not found
                </h1>

                <p className="mt-3 text-slate-600">
                    The dossier does not exist, or it is no longer
                    available.
                </p>

                <Link
                    href="/dashboard"
                    className="mt-6 inline-block rounded-md bg-slate-900 px-5 py-3 font-medium text-white"
                >
                    Return to dashboard
                </Link>
            </div>
        </main>
    );
}