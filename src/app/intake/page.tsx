import type { Metadata } from "next";

import { IntakeForm } from "@/components/intake-form";

export const metadata: Metadata = {
    title: "Client intake | Dossier Assistant",
    description: "Submit a new client request for analysis.",
};

export default function IntakePage() {
    return (
        <main className="min-h-screen bg-slate-50 px-4 py-12">
            <div className="mx-auto max-w-2xl">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Client intake
                    </h1>

                    <p className="mt-3 text-slate-600">
                        Describe what your company needs. Your request will be
                        stored as a dossier and prepared for review.
                    </p>
                </header>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <IntakeForm />
                </section>
            </div>
        </main>
    );
}