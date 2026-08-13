export default function DossierLoading() {
    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div
                className="mx-auto max-w-5xl"
                aria-busy="true"
                aria-label="Loading dossier"
            >
                <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-6 h-12 w-80 animate-pulse rounded bg-slate-200" />

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
                    <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
                </div>
            </div>
        </main>
    );
}