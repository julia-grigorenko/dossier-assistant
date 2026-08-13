export default function DashboardLoading() {
    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div
                className="mx-auto max-w-7xl"
                aria-busy="true"
                aria-label="Loading dossiers"
            >
                <div className="mb-8 h-10 w-72 animate-pulse rounded bg-slate-200" />

                <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, index) => (
                        <div
                            key={index}
                            className="h-16 animate-pulse rounded-lg bg-slate-200"
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}