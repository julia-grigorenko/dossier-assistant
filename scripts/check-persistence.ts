import { dossierService } from "../src/services/dossier.service";

async function main(): Promise<void> {
    console.log("1. Creating dossier");

    const created = await dossierService.create({
        fullName: "Integration Test",
        email: `integration-${Date.now()}@example.com`,
        companyName: "Integration Test Company",
        originalRequest:
            "We need financing for equipment used by the business.",
    });

    if (!created.ok) {
        throw new Error(JSON.stringify(created));
    }

    console.log(created.data.id, created.data.status);

    console.log("2. Retrieving dossier");

    const retrieved = await dossierService.findById(created.data.id);

    if (!retrieved.ok) {
        throw new Error(JSON.stringify(retrieved));
    }

    console.log(retrieved.data.id, retrieved.data.status);

    console.log("3. Updating analysis");

    const updated = await dossierService.updateAnalysis(created.data.id, {
        requestType: "BUSINESS_FINANCING",
        requestedAmount: 50_000,
        annualRevenue: 250_000,
        companyAgeYears: 4,
        urgency: "MEDIUM",
        summary: "Business requests financing for new equipment.",
        missingFields: [],
        confidence: 0.9,
    });

    if (!updated.ok) {
        throw new Error(JSON.stringify(updated));
    }

    console.log(updated.data.id, updated.data.status);

    console.log("4. Approving dossier");

    const approved = await dossierService.approve(created.data.id);

    if (!approved.ok) {
        throw new Error(JSON.stringify(approved));
    }

    console.log(
        approved.data.id,
        approved.data.status,
        approved.data.approvedAt,
    );

    console.log("5. Confirming stored state");

    const confirmed = await dossierService.findById(created.data.id);

    if (!confirmed.ok) {
        throw new Error(JSON.stringify(confirmed));
    }

    console.log(JSON.stringify(confirmed.data, null, 2));

    if (
        confirmed.data.status !== "APPROVED" ||
        confirmed.data.approvedAt === null
    ) {
        throw new Error("Stored dossier was not approved correctly");
    }

    console.log("Persistence integration check passed.");
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});