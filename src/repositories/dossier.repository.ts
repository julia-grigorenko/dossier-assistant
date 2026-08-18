import "server-only";

import type {
    CreateDossierInput,
    Dossier,
    DossierStatus,
    ExtractedAnalysis,
} from "@/domain/dossier/dossier.types";

import type {
    CreatedDossierJob,
} from "@/domain/dossier/workflow.types";

import { supabaseAdmin } from "@/lib/db/client";

import {
    mapAnalysisCallbackStateRow,
    mapAnalysisUpdate,
    mapCreateInput,
    mapDossierRow,
    mapProcessingContextRow,
} from "./dossier.mapper";

import type {
    AnalysisCallbackState,
    AnalysisCallbackStateRow,
    DossierRow,
    ProcessingContextRecord,
    ProcessingContextRow,
    FailedAnalysisCallbackUpdate,
    MalformedAnalysisCallbackUpdate,
    SuccessfulAnalysisCallbackUpdate,
} from "./dossier-row";

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
    async create(input: CreateDossierInput): Promise<CreatedDossierJob> {
        const processingToken = crypto.randomUUID();
        const insert = mapCreateInput(input, processingToken);

        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .insert(insert)
            .select("*")
            .single();

        const row = await requireData(data as DossierRow | null, error);

        return {
            dossier: mapDossierRow(row),
            processingToken,
        };
    },

    async markWorkflowTriggerFailed(
        id: string,
        suppliedToken: string,
    ): Promise<Dossier | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update({
                status: "PROCESSING_FAILED",
                processing_error: "WORKFLOW_TRIGGER_FAILED",
                processing_token: null,
            })
            .eq("id", id)
            .eq("status", "PROCESSING")
            .eq("processing_token", suppliedToken)
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to record workflow trigger failure: ${error.message}`,
            );
        }

        return data
            ? mapDossierRow(data as DossierRow)
            : null;
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

    async findAll(status?: DossierStatus): Promise<Dossier[]> {
        let query = supabaseAdmin
            .from(TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (status) {
            query = query.eq("status", status);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to list dossiers: ${error.message}`);
        }

        return (data as DossierRow[]).map(mapDossierRow);
    },

    async findAnalysisCallbackState(
        id: string,
    ): Promise<AnalysisCallbackState | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select(`
      id,
      status,
      processing_token
    `)
            .eq("id", id)
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to retrieve callback state: ${error.message}`,
            );
        }

        return data
            ? mapAnalysisCallbackStateRow(
                data as AnalysisCallbackStateRow,
            )
            : null;
    },

    async completeAnalysisSuccess(
        id: string,
        suppliedToken: string,
        update: SuccessfulAnalysisCallbackUpdate,
    ): Promise<Dossier | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update(update)
            .eq("id", id)
            .eq("status", "PROCESSING")
            .eq("processing_token", suppliedToken)
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to complete analysis: ${error.message}`,
            );
        }

        return data
            ? mapDossierRow(data as DossierRow)
            : null;
    },

    async completeMalformedAnalysis(
        id: string,
        suppliedToken: string,
        update: MalformedAnalysisCallbackUpdate,
    ): Promise<Dossier | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update(update)
            .eq("id", id)
            .eq("status", "PROCESSING")
            .eq("processing_token", suppliedToken)
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to store malformed analysis result: ${error.message}`,
            );
        }

        return data
            ? mapDossierRow(data as DossierRow)
            : null;
    },

    async completeAnalysisFailure(
        id: string,
        suppliedToken: string,
        update: FailedAnalysisCallbackUpdate,
    ): Promise<Dossier | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .update(update)
            .eq("id", id)
            .eq("status", "PROCESSING")
            .eq("processing_token", suppliedToken)
            .select("*")
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to store analysis failure: ${error.message}`,
            );
        }

        return data
            ? mapDossierRow(data as DossierRow)
            : null;
    },

    async findProcessingContext(
        id: string,
    ): Promise<ProcessingContextRecord | null> {
        const { data, error } = await supabaseAdmin
            .from(TABLE)
            .select(`
      id,
      full_name,
      company_name,
      original_request,
      status,
      processing_token
    `)
            .eq("id", id)
            .maybeSingle();

        if (error) {
            throw new Error(
                `Failed to retrieve processing context: ${error.message}`,
            );
        }

        return data
            ? mapProcessingContextRow(
                data as ProcessingContextRow,
            )
            : null;
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

