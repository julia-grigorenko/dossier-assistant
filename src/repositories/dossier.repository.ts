import "server-only";

import type {
    CreateDossierInput,
    Dossier,
    DossierStatus,
    ExtractedAnalysis,
} from "@/domain/dossier/dossier.types";
import { supabaseAdmin } from "@/lib/db/client";

import {
    mapAnalysisUpdate,
    mapCreateInput,
    mapDossierRow,
} from "./dossier.mapper";
import type { DossierRow } from "./dossier-row";

const TABLE = "dossiers";

async function requireData<T>(
    data: T | null,
    error: { message: string } | null,
): Promise<T> {
    if (error) {
        throw new Error(`Database operation failed: ${error.message}`);
    }

    if (data === null) {
        throw new Error("Database operation returned no data");
    }

    return data;
}

export const dossierRepository = {
    async create(input: CreateDossierInput): Promise<Dossier> {
        const processingToken = crypto.randomUUID();
        const insert = mapCreateInput(input, processingToken);

        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .insert(insert)
            .select("*")
            .single();

        const row = await requireData(data as DossierRow | null, error);

        return mapDossierRow(row);
    },

    async findById(id: string): Promise<Dossier | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to retrieve dossier: ${error.message}`);
        }

        return data ? mapDossierRow(data as DossierRow) : null;
    },

    async findAll(): Promise<Dossier[]> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(`Failed to list dossiers: ${error.message}`);
        }

        return (data as DossierRow[]).map(mapDossierRow);
    },

    async updateAnalysis(
        id: string,
        analysis: ExtractedAnalysis,
        status: "READY" | "NEEDS_REVIEW",
        warnings: string[],
    ): Promise<Dossier | null> {
        const update = mapAnalysisUpdate(analysis, status, warnings);

        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update(update)
            .eq("id", id)
            .neq("status", "APPROVED")
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to update analysis: ${error.message}`);
        }

        return data ? mapDossierRow(data as DossierRow) : null;
    },

    async updateStatus(
        id: string,
        currentStatus: DossierStatus,
        nextStatus: DossierStatus,
    ): Promise<Dossier | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update({
                status: nextStatus,
                approved_at: null,
            })
            .eq("id", id)
            .eq("status", currentStatus)
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to update status: ${error.message}`);
        }

        return data ? mapDossierRow(data as DossierRow) : null;
    },

    async approve(
        id: string,
        currentStatus: Extract<
            DossierStatus,
            "READY" | "NEEDS_REVIEW"
        >,
    ): Promise<Dossier | null> {
        const approvedAt = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update({
                status: "APPROVED",
                approved_at: approvedAt,
            })
            .eq("id", id)
            .eq("status", currentStatus)
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to approve dossier: ${error.message}`);
        }

        return data ? mapDossierRow(data as DossierRow) : null;
    },
};